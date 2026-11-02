using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;

namespace HeatCheck.EditorTools
{
    /// <summary>
    /// Builds the Heat Check scene: a street in Lubbock with a moving truck, a house with a porch,
    /// a shade tree with a water cooler, and an air-conditioned store across the street.
    /// The first time the project opens, the scene is built and opened for you. After that it's an
    /// ordinary scene you can edit by hand. Heat Check → Rebuild Scene starts it over.
    /// </summary>
    [InitializeOnLoad]
    static class SceneBuilder
    {
        public const string ScenePath = "Assets/HeatCheck/Scenes/HeatCheck.unity";
        const string SceneFolder = "Assets/HeatCheck/Scenes";
        const string MaterialFolder = "Assets/HeatCheck/Materials";

        static readonly Vector3 Spawn = new Vector3(8f, 0f, 1f);
        const float SpawnYaw = 90f;

        // 3 PM in summer: the sun is high in the southwest, so shadows fall to the northeast.
        // In this scene north is -Z (the store's side of the street) and east is +X (the truck's end).
        static readonly Quaternion SunRotation = Quaternion.Euler(50f, 160f, 0f);

        static SceneBuilder()
        {
            if (Application.isBatchMode) return;
            EditorApplication.delayCall += FirstOpen;
        }

        static void FirstOpen()
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode) return;
            if (SessionState.GetBool("HeatCheck.FirstOpenDone", false)) return;
            SessionState.SetBool("HeatCheck.FirstOpenDone", true);

            if (!File.Exists(ScenePath))
            {
                Build();
                return;
            }

            // Open the scene when Unity starts on an empty, unsaved one.
            var active = SceneManager.GetActiveScene();
            if (string.IsNullOrEmpty(active.path) && !active.isDirty) EditorSceneManager.OpenScene(ScenePath);
        }

        [MenuItem("Heat Check/Open Scene", priority = 1)]
        static void OpenScene()
        {
            if (!File.Exists(ScenePath))
            {
                Build();
                return;
            }
            if (EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) EditorSceneManager.OpenScene(ScenePath);
        }

        [MenuItem("Heat Check/Rebuild Scene", priority = 2)]
        static void Rebuild()
        {
            if (File.Exists(ScenePath)
                && !EditorUtility.DisplayDialog(
                    "Rebuild the Heat Check scene?",
                    "This replaces HeatCheck.unity with a fresh copy. Anything you changed in it by hand will be lost.",
                    "Rebuild",
                    "Cancel"))
                return;
            if (!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
            Build();
        }

        [MenuItem("Heat Check/Add XR Rig", priority = 20)]
        static void AddXRRig()
        {
            var scene = SceneManager.GetActiveScene();
            if (scene.path != ScenePath)
            {
                EditorUtility.DisplayDialog("Heat Check", "Open the Heat Check scene first (Heat Check → Open Scene).", "OK");
                return;
            }

            var prefab = FindPrefab("XR Interaction Setup") ?? FindPrefab("XR Origin (XR Rig)");
            if (prefab == null)
            {
                EditorUtility.DisplayDialog(
                    "Starter Assets not found",
                    "Install the XR Interaction Toolkit, then in Package Manager select it, open the Samples tab and import \"Starter Assets\". Then try again.",
                    "OK");
                return;
            }

            var rig = (GameObject)PrefabUtility.InstantiatePrefab(prefab, scene);
            rig.transform.SetPositionAndRotation(Spawn, Quaternion.Euler(0f, SpawnYaw, 0f));
            Undo.RegisterCreatedObjectUndo(rig, "Add XR Rig");

            var desktop = Object.FindFirstObjectByType<DesktopPlayer>(FindObjectsInactive.Include);
            if (desktop != null)
            {
                Undo.RecordObject(desktop.gameObject, "Add XR Rig");
                desktop.gameObject.SetActive(false);
            }

            EditorSceneManager.MarkSceneDirty(scene);
            Selection.activeGameObject = rig;
            Debug.Log("Heat Check: added " + prefab.name + " and turned off the desktop player. Save the scene to keep it.");
        }

        static GameObject FindPrefab(string name)
        {
            foreach (var guid in AssetDatabase.FindAssets("t:Prefab"))
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                if (Path.GetFileNameWithoutExtension(path) == name) return AssetDatabase.LoadAssetAtPath<GameObject>(path);
            }
            return null;
        }

        static void Build()
        {
            EnsureFolder(SceneFolder);
            EnsureFolder(MaterialFolder);

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var mats = new Palette();

            // Sky, haze and sun.
            RenderSettings.skybox = AssetDatabase.GetBuiltinExtraResource<Material>("Default-Skybox.mat");
            // Three-color ambient light works without baking any lighting.
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.72f, 0.78f, 0.88f);
            RenderSettings.ambientEquatorColor = new Color(0.7f, 0.65f, 0.56f);
            RenderSettings.ambientGroundColor = new Color(0.42f, 0.37f, 0.3f);
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.Exponential;
            RenderSettings.fogDensity = 0.006f;
            RenderSettings.fogColor = new Color(0.93f, 0.87f, 0.74f);

            var sun = new GameObject("Sun").AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.transform.rotation = SunRotation;
            sun.color = new Color(1f, 0.95f, 0.86f);
            sun.intensity = 1.3f;
            sun.shadows = LightShadows.Soft;
            sun.shadowStrength = 0.9f;
            RenderSettings.sun = sun;

            var world = new GameObject("World").transform;
            BuildStreet(world, mats);
            var pile = BuildTruck(world, mats);
            var porch = BuildHouse(world, mats);
            BuildTree(world, mats, sun.transform.forward);
            BuildStore(world, mats);
            Sign(world, new Vector3(6.5f, 2.4f, -2.6f), Spawn + Vector3.up * 1.6f, new Vector2(1.8f, 0.9f),
                "3:00 PM\n104°F", 0.3f, new Color(0.12f, 0.12f, 0.13f), new Color(1f, 0.55f, 0.15f));

            // The game itself.
            var gameObject = new GameObject("Heat Check");
            var body = gameObject.AddComponent<Body>();
            var game = gameObject.AddComponent<HeatCheckGame>();
            var effects = gameObject.AddComponent<HeatEffects>();
            var panel = new GameObject("Body panel").AddComponent<BodyPanel>();

            // Desktop player. Heat Check → Add XR Rig swaps this for a headset rig.
            var player = new GameObject("Player (desktop)");
            player.transform.SetPositionAndRotation(Spawn, Quaternion.Euler(0f, SpawnYaw, 0f));
            var controller = player.AddComponent<CharacterController>();
            controller.height = 1.8f;
            controller.radius = 0.3f;
            controller.center = new Vector3(0f, 0.9f, 0f);
            var head = new GameObject("Head");
            head.transform.SetParent(player.transform, false);
            head.transform.localPosition = new Vector3(0f, 1.65f, 0f);
            head.tag = "MainCamera";
            var cam = head.AddComponent<Camera>();
            cam.fieldOfView = 70f;
            cam.nearClipPlane = 0.05f;
            head.AddComponent<AudioListener>();
            var desktop = player.AddComponent<DesktopPlayer>();

            Link(body, "sun", sun);
            Link(game, "pile", pile);
            Link(game, "porch", porch);
            Link(game, "desktopPlayer", desktop);
            Link(game, "panel", panel);
            Link(game, "effects", effects);
            Link(effects, "body", body);
            Link(panel, "game", game);
            Link(desktop, "game", game);
            Link(desktop, "head", head.transform);

            EditorSceneManager.SaveScene(scene, ScenePath);
            AddToBuildSettings();
            AssetDatabase.SaveAssets();
            Debug.Log("Heat Check: built " + ScenePath + ". Press Play.");
        }

        // ---------- The world ----------

        static void BuildStreet(Transform world, Palette m)
        {
            var ground = Make.Primitive(PrimitiveType.Plane, "Ground", world, Vector3.zero, new Vector3(12f, 1f, 12f), m.Ground);
            ground.isStatic = true;

            Static(Make.Cube("Street", world, new Vector3(0f, 0.02f, -6f), new Vector3(120f, 0.04f, 6f), m.Asphalt));
            Static(Make.Cube("Sidewalk (north)", world, new Vector3(0f, 0.04f, -2.2f), new Vector3(120f, 0.08f, 1.6f), m.Concrete));
            Static(Make.Cube("Sidewalk (south)", world, new Vector3(0f, 0.04f, -9.8f), new Vector3(120f, 0.08f, 1.6f), m.Concrete));
            for (float x = -58f; x <= 58f; x += 5f)
                Decor(Make.Cube("Lane line", world, new Vector3(x, 0.045f, -6f), new Vector3(2.4f, 0.01f, 0.14f), m.Paint));
            Static(Make.Cube("Driveway", world, new Vector3(15f, 0.015f, 0.2f), new Vector3(7f, 0.03f, 4.4f), m.Concrete));
        }

        static BoxPile BuildTruck(Transform world, Palette m)
        {
            var truck = new GameObject("Moving truck").transform;
            truck.SetParent(world, false);
            Make.Cube("Cargo box", truck, new Vector3(15.2f, 1.6f, 1f), new Vector3(4.4f, 2.4f, 2.3f), m.TruckWhite);
            Make.Cube("Cab", truck, new Vector3(18.4f, 1.25f, 1f), new Vector3(2f, 1.7f, 2.2f), m.TruckWhite);
            Decor(Make.Cube("Windshield", truck, new Vector3(19.41f, 1.55f, 1f), new Vector3(0.03f, 0.7f, 1.9f), m.Glass));
            Decor(Make.Cube("Bumper", truck, new Vector3(12.9f, 0.5f, 1f), new Vector3(0.25f, 0.2f, 2.3f), m.Metal));
            foreach (var x in new[] { 14f, 18.4f })
            foreach (var z in new[] { -0.1f, 2.1f })
            {
                var wheel = Make.Primitive(PrimitiveType.Cylinder, "Wheel", truck, new Vector3(x, 0.45f, z), new Vector3(0.9f, 0.14f, 0.9f), m.Tire);
                wheel.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
                Decor(wheel);
            }
            Label(truck, new Vector3(15.2f, 1.9f, -0.17f), Vector3.forward, "MOVING DAY", 0.35f, new Color(0.85f, 0.35f, 0.1f));
            Static(truck.gameObject);

            // Eight boxes at the back of the truck, bottom layer first so the top ones get taken first.
            var pile = new GameObject("Boxes").AddComponent<BoxPile>();
            pile.transform.SetParent(world, false);
            pile.transform.localPosition = new Vector3(11.9f, 0f, 1f);
            for (int layer = 0; layer < 2; layer++)
            for (int i = 0; i < 4; i++)
            {
                var offset = new Vector3(i % 2 == 0 ? -0.25f : 0.25f, 0.225f + layer * 0.45f, i < 2 ? -0.25f : 0.25f);
                var box = Make.Cube("Box", pile.transform, offset, Vector3.one * 0.44f, m.Cardboard);
                box.transform.localRotation = Quaternion.Euler(0f, (i * 7 + layer * 11) % 9 - 4f, 0f);
            }

            Sign(world, new Vector3(12.9f, 1.7f, 3f), Spawn + Vector3.up * 1.6f, new Vector2(2.3f, 0.8f),
                "MOVE 8 BOXES\nto the porch down the street", 0.12f, m.SignColor, m.SignText);
            return pile;
        }

        static Porch BuildHouse(Transform world, Palette m)
        {
            var house = new GameObject("House").transform;
            house.SetParent(world, false);
            Make.Cube("Walls", house, new Vector3(-18f, 2.25f, 1f), new Vector3(8f, 4.5f, 10f), m.Brick);
            Make.Cube("Roof", house, new Vector3(-18f, 4.7f, 1f), new Vector3(8.8f, 0.4f, 10.8f), m.Roof);
            Decor(Make.Cube("Door", house, new Vector3(-13.98f, 1.4f, 1f), new Vector3(0.06f, 2.2f, 1.1f), m.DarkWood));
            Decor(Make.Cube("Window", house, new Vector3(-13.98f, 2.2f, -2.2f), new Vector3(0.05f, 1.1f, 1.4f), m.Glass));
            Decor(Make.Cube("Window", house, new Vector3(-13.98f, 2.2f, 4.2f), new Vector3(0.05f, 1.1f, 1.4f), m.Glass));
            Make.Cube("Porch floor", house, new Vector3(-12f, 0.15f, 1f), new Vector3(4f, 0.3f, 6.5f), m.Wood);
            Make.Cube("Step", house, new Vector3(-9.7f, 0.075f, 1f), new Vector3(0.6f, 0.15f, 2.2f), m.Wood);
            Make.Cube("Porch roof", house, new Vector3(-12f, 3.2f, 1f), new Vector3(4.4f, 0.2f, 6.9f), m.Roof);
            Make.Cube("Post", house, new Vector3(-10.1f, 1.75f, -2.1f), new Vector3(0.18f, 2.9f, 0.18f), m.Trim);
            Make.Cube("Post", house, new Vector3(-10.1f, 1.75f, 4.1f), new Vector3(0.18f, 2.9f, 0.18f), m.Trim);
            Static(house.gameObject);

            var spot = Make.Cube("Drop spot", world, new Vector3(-11.4f, 0.32f, 1f), new Vector3(1.6f, 0.04f, 1.6f), m.Paint);
            var porch = spot.AddComponent<Porch>();

            var stack = new GameObject("Delivered boxes").transform;
            stack.SetParent(world, false);
            stack.localPosition = new Vector3(-12.9f, 0.3f, 1f);
            for (int layer = 0; layer < 2; layer++)
            for (int i = 0; i < 4; i++)
            {
                var offset = new Vector3(i % 2 == 0 ? -0.25f : 0.25f, 0.225f + layer * 0.45f, i < 2 ? -0.25f : 0.25f);
                var box = Make.Cube("Box", stack, offset, Vector3.one * 0.44f, m.Cardboard);
                Make.RemoveCollider(box);
                box.SetActive(false);
            }
            Link(porch, "stack", stack);

            Sign(world, new Vector3(-9.3f, 1.3f, -1f), new Vector3(0f, 1.6f, 1f), new Vector2(1.3f, 0.6f),
                "PORCH\nBoxes go here", 0.12f, m.SignColor, m.SignText);
            return porch;
        }

        static void BuildTree(Transform world, Palette m, Vector3 sunDirection)
        {
            var tree = new GameObject("Shade tree").transform;
            tree.SetParent(world, false);
            var canopyCenter = new Vector3(0f, 5.6f, 9f);
            Make.Primitive(PrimitiveType.Cylinder, "Trunk", tree, new Vector3(0f, 2.5f, 9f), new Vector3(0.55f, 2.5f, 0.55f), m.Bark);
            Make.Primitive(PrimitiveType.Sphere, "Canopy", tree, canopyCenter, new Vector3(5.8f, 4.4f, 5.8f), m.Leaves);
            Make.Primitive(PrimitiveType.Sphere, "Canopy", tree, canopyCenter + new Vector3(1.4f, 1f, -0.6f), new Vector3(3.6f, 3f, 3.6f), m.Leaves);
            Static(tree.gameObject);

            // Put the water cooler right where the canopy's shadow lands.
            float t = -canopyCenter.y / sunDirection.y;
            var shade = canopyCenter + sunDirection * t;
            shade.y = 0f;

            Make.Cube("Table", world, shade + new Vector3(0f, 0.375f, 0f), new Vector3(1.2f, 0.75f, 0.7f), m.Wood);
            var cooler = Make.Primitive(PrimitiveType.Cylinder, "Water cooler", world, shade + new Vector3(0f, 1.03f, 0f), new Vector3(0.45f, 0.28f, 0.45f), m.Cooler);
            cooler.AddComponent<WaterCooler>();
            Decor(Make.Primitive(PrimitiveType.Cylinder, "Lid", world, shade + new Vector3(0f, 1.33f, 0f), new Vector3(0.47f, 0.03f, 0.47f), m.TruckWhite));
            Make.Cube("Bench", world, shade + new Vector3(1.6f, 0.23f, 0.9f), new Vector3(1.8f, 0.45f, 0.5f), m.DarkWood);

            Sign(world, shade + new Vector3(-1.4f, 1.6f, 0.7f), new Vector3(shade.x, 1.6f, 0f), new Vector2(2.4f, 0.85f),
                "WATER AND SHADE\nDrink a cup every 15-20 minutes.\nRest here when you feel hot.", 0.1f, m.SignColor, m.SignText);
        }

        static void BuildStore(Transform world, Palette m)
        {
            var store = new GameObject("Store").transform;
            store.SetParent(world, false);
            const float height = 3.6f;
            Make.Cube("Floor", store, new Vector3(0f, 0.025f, -14f), new Vector3(8f, 0.05f, 6f), m.Concrete);
            Make.Cube("Back wall", store, new Vector3(0f, height / 2f, -17f), new Vector3(8f, height, 0.3f), m.StoreWall);
            Make.Cube("Left wall", store, new Vector3(-4f, height / 2f, -14f), new Vector3(0.3f, height, 6f), m.StoreWall);
            Make.Cube("Right wall", store, new Vector3(4f, height / 2f, -14f), new Vector3(0.3f, height, 6f), m.StoreWall);
            Make.Cube("Front wall", store, new Vector3(-2.5f, height / 2f, -11f), new Vector3(3f, height, 0.3f), m.StoreWall);
            Make.Cube("Front wall", store, new Vector3(2.5f, height / 2f, -11f), new Vector3(3f, height, 0.3f), m.StoreWall);
            Make.Cube("Above door", store, new Vector3(0f, 3.2f, -11f), new Vector3(2f, 0.8f, 0.3f), m.StoreWall);
            Make.Cube("Roof", store, new Vector3(0f, height + 0.15f, -14f), new Vector3(8.4f, 0.3f, 6.4f), m.Roof);
            Make.Cube("Counter", store, new Vector3(-2f, 0.5f, -15.8f), new Vector3(3f, 1f, 0.8f), m.DarkWood);
            Static(store.gameObject);

            var zone = new GameObject("Air conditioning").AddComponent<IndoorZone>();
            zone.transform.SetParent(store, false);
            zone.transform.localPosition = new Vector3(0f, 1.5f, -14f);
            zone.Size = new Vector3(7.4f, 3f, 5.4f);

            var light = new GameObject("Cool light").AddComponent<Light>();
            light.transform.SetParent(store, false);
            light.transform.localPosition = new Vector3(0f, 3.2f, -14f);
            light.type = LightType.Point;
            light.color = new Color(0.72f, 0.86f, 1f);
            light.intensity = 1.6f;
            light.range = 8f;

            Sign(world, new Vector3(0f, 3.2f, -10.8f), new Vector3(0f, 1.6f, -6f), new Vector2(2.6f, 0.62f),
                "AIR CONDITIONED\nCome in and cool down", 0.14f, new Color(0.15f, 0.35f, 0.6f), Color.white, post: false);
        }

        // ---------- Helpers ----------

        static void Sign(Transform world, Vector3 center, Vector3 viewer, Vector2 size, string text, float lineHeight,
            Color board, Color ink, bool post = true)
        {
            var facing = Vector3.ProjectOnPlane(center - viewer, Vector3.up).normalized;
            var rotation = Quaternion.LookRotation(facing);

            var sign = new GameObject("Sign").transform;
            sign.SetParent(world, false);
            sign.SetPositionAndRotation(center, rotation);

            Make.Cube("Board", sign, Vector3.zero, new Vector3(size.x, size.y, 0.06f), new Palette().Flat("Sign " + ColorUtility.ToHtmlStringRGB(board), board));
            if (post)
                Make.Cube("Post", sign, new Vector3(0f, -(center.y + size.y / 2f) / 2f, 0.05f), new Vector3(0.08f, center.y - size.y / 2f, 0.08f), new Palette().Metal);
            Label(sign, new Vector3(0f, 0f, -0.04f), Vector3.forward, text, lineHeight, ink, local: true);
            Static(sign.gameObject);
        }

        static void Label(Transform parent, Vector3 position, Vector3 readDirection, string text, float lineHeight, Color color, bool local = false)
        {
            var mesh = Make.Text("Text", parent, Vector3.zero, text, lineHeight, color, TextAnchor.MiddleCenter, Palette.SignTextMaterial());
            if (local)
            {
                mesh.transform.localPosition = position;
                mesh.transform.localRotation = Quaternion.identity;
            }
            else
            {
                mesh.transform.position = position;
                mesh.transform.rotation = Quaternion.LookRotation(readDirection);
            }
        }

        static void Static(GameObject go)
        {
            foreach (var t in go.GetComponentsInChildren<Transform>(true)) t.gameObject.isStatic = true;
        }

        static void Decor(GameObject go)
        {
            Make.RemoveCollider(go);
            go.isStatic = true;
        }

        static void Link(Object target, string field, Object value)
        {
            var so = new SerializedObject(target);
            var property = so.FindProperty(field);
            if (property == null)
            {
                Debug.LogError($"Heat Check: {target.GetType().Name} has no field called '{field}'.");
                return;
            }
            property.objectReferenceValue = value;
            so.ApplyModifiedPropertiesWithoutUndo();
        }

        static void EnsureFolder(string path)
        {
            if (AssetDatabase.IsValidFolder(path)) return;
            var parent = Path.GetDirectoryName(path).Replace('\\', '/');
            EnsureFolder(parent);
            AssetDatabase.CreateFolder(parent, Path.GetFileName(path));
        }

        static void AddToBuildSettings()
        {
            var scenes = new List<EditorBuildSettingsScene>(EditorBuildSettings.scenes);
            if (scenes.Exists(s => s.path == ScenePath)) return;
            scenes.Insert(0, new EditorBuildSettingsScene(ScenePath, true));
            EditorBuildSettings.scenes = scenes.ToArray();
        }

        /// <summary>Materials, saved as assets in Assets/HeatCheck/Materials so the scene can reference them.</summary>
        sealed class Palette
        {
            public Material Ground => Flat("Ground", new Color(0.72f, 0.63f, 0.45f));
            public Material Asphalt => Flat("Asphalt", new Color(0.2f, 0.2f, 0.22f));
            public Material Concrete => Flat("Concrete", new Color(0.76f, 0.74f, 0.7f));
            public Material Paint => Flat("Yellow paint", new Color(0.95f, 0.78f, 0.2f));
            public Material TruckWhite => Flat("Truck white", new Color(0.93f, 0.93f, 0.91f), 0.4f);
            public Material Glass => Flat("Glass", new Color(0.2f, 0.28f, 0.36f), 0.8f);
            public Material Metal => Flat("Metal", new Color(0.45f, 0.46f, 0.48f), 0.5f);
            public Material Tire => Flat("Tire", new Color(0.08f, 0.08f, 0.08f));
            public Material Cardboard => Flat("Cardboard", new Color(0.7f, 0.52f, 0.32f));
            public Material Brick => Flat("Brick", new Color(0.6f, 0.34f, 0.25f));
            public Material Roof => Flat("Roof", new Color(0.3f, 0.27f, 0.25f));
            public Material Wood => Flat("Wood", new Color(0.56f, 0.42f, 0.3f));
            public Material DarkWood => Flat("Dark wood", new Color(0.33f, 0.23f, 0.16f));
            public Material Trim => Flat("Trim", new Color(0.92f, 0.9f, 0.85f));
            public Material Bark => Flat("Bark", new Color(0.38f, 0.27f, 0.18f));
            public Material Leaves => Flat("Leaves", new Color(0.3f, 0.46f, 0.2f));
            public Material Cooler => Flat("Cooler orange", new Color(0.95f, 0.45f, 0.1f), 0.3f);
            public Material StoreWall => Flat("Store wall", new Color(0.82f, 0.84f, 0.86f));
            public Color SignColor => new Color(0.96f, 0.95f, 0.9f);
            public Color SignText => new Color(0.13f, 0.13f, 0.14f);

            public static Material SignTextMaterial()
            {
                var path = $"{MaterialFolder}/Sign text.mat";
                var existing = AssetDatabase.LoadAssetAtPath<Material>(path);
                if (existing != null) return existing;
                var shader = Shader.Find("HeatCheck/Sign Text");
                if (shader == null) return Make.Font.material;
                var material = new Material(shader) { name = "Sign text", mainTexture = Make.Font.material.mainTexture };
                AssetDatabase.CreateAsset(material, path);
                return material;
            }

            public Material Flat(string name, Color color, float smoothness = 0.1f)
            {
                var path = $"{MaterialFolder}/{name}.mat";
                var existing = AssetDatabase.LoadAssetAtPath<Material>(path);
                if (existing != null) return existing;
                var material = Make.Lit(color, smoothness);
                material.name = name;
                AssetDatabase.CreateAsset(material, path);
                return material;
            }
        }
    }
}
