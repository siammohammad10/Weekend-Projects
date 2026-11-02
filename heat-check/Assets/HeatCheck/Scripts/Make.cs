using UnityEngine;
using UnityEngine.Rendering;

namespace HeatCheck
{
    /// <summary>Small helpers for making materials and text from code, at edit time and at runtime.</summary>
    public static class Make
    {
        // TextMesh sizes are set as a rough line height in meters. If text looks too big or too small
        // in your Unity version, change this one number.
        public const float TextScale = 1f;

        // Text drawn on top of the screen overlays (vignette, fade) uses this render queue.
        public const int OverlayTextQueue = 3100;

        static Font font;

        public static Font Font
        {
            get
            {
                if (font == null) font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
                return font;
            }
        }

        public static Shader LitShader()
        {
            // Works in the built-in render pipeline and in URP.
            var shader = GraphicsSettings.currentRenderPipeline == null
                ? Shader.Find("Standard")
                : Shader.Find("Universal Render Pipeline/Lit");
            return shader != null ? shader : Shader.Find("Standard");
        }

        public static Material Lit(Color color, float smoothness = 0.1f)
        {
            var m = new Material(LitShader()) { color = color };
            if (m.HasProperty("_Glossiness")) m.SetFloat("_Glossiness", smoothness);
            if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", smoothness);
            return m;
        }

        /// <summary>Unlit, alpha-blended material for screen overlays.</summary>
        public static Material Overlay(Color color)
        {
            var shader = Shader.Find("Sprites/Default");
            if (shader == null) shader = Shader.Find("Unlit/Transparent");
            return new Material(shader) { color = color, renderQueue = 3050 };
        }

        public static Material OverlayTextMaterial()
        {
            return new Material(Font.material) { renderQueue = OverlayTextQueue };
        }

        public static TextMesh Text(
            string name,
            Transform parent,
            Vector3 localPosition,
            string text,
            float lineHeight,
            Color color,
            TextAnchor anchor = TextAnchor.MiddleCenter,
            Material material = null)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localPosition;

            go.AddComponent<MeshRenderer>();
            var mesh = go.AddComponent<TextMesh>();
            mesh.font = Font;
            mesh.fontSize = 64;
            mesh.characterSize = lineHeight * 10f / mesh.fontSize * TextScale;
            mesh.anchor = anchor;
            mesh.alignment = anchor == TextAnchor.UpperLeft || anchor == TextAnchor.MiddleLeft || anchor == TextAnchor.LowerLeft
                ? TextAlignment.Left
                : TextAlignment.Center;
            mesh.richText = true;
            mesh.color = color;
            mesh.text = text;

            go.GetComponent<MeshRenderer>().sharedMaterial = material != null ? material : Font.material;
            return mesh;
        }

        public static GameObject Cube(string name, Transform parent, Vector3 position, Vector3 size, Material material)
        {
            return Primitive(PrimitiveType.Cube, name, parent, position, size, material);
        }

        public static GameObject Primitive(
            PrimitiveType type,
            string name,
            Transform parent,
            Vector3 position,
            Vector3 scale,
            Material material)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.localPosition = position;
            go.transform.localScale = scale;
            if (material != null) go.GetComponent<Renderer>().sharedMaterial = material;
            return go;
        }

        public static void RemoveCollider(GameObject go)
        {
            var collider = go.GetComponent<Collider>();
            if (collider == null) return;
            collider.enabled = false;
            if (Application.isPlaying) Object.Destroy(collider);
            else Object.DestroyImmediate(collider);
        }
    }
}
