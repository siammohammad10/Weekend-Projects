using UnityEngine;

namespace HeatCheck
{
    /// <summary>
    /// What overheating looks and sounds like: the edges of your vision close in and turn red,
    /// and you start to hear your heartbeat, faster and louder as your temperature climbs.
    /// </summary>
    [RequireComponent(typeof(AudioSource))]
    public sealed class HeatEffects : MonoBehaviour
    {
        [SerializeField] Body body;

        const float OverlayDistance = 0.3f;

        AudioSource audioSource;
        AudioClip heartbeat;
        float nextBeat;
        float beatGlow;

        Transform overlays;
        Transform vignetteQuad;
        Transform fadeQuad;
        Material vignette;
        Material fade;
        float fadeAmount;
        float fadeTarget;

        void Awake()
        {
            audioSource = GetComponent<AudioSource>();
            audioSource.playOnAwake = false;
            audioSource.spatialBlend = 0f;
            heartbeat = MakeHeartbeat();

            vignette = Make.Overlay(Color.clear);
            vignette.mainTexture = MakeVignetteTexture();
            fade = Make.Overlay(Color.clear);
            fade.renderQueue = 3060;
        }

        public void FadeTo(float amount) => fadeTarget = Mathf.Clamp01(amount);

        void LateUpdate()
        {
            var cam = Player.Camera;
            if (cam == null) return;
            if (overlays == null || overlays.parent != cam.transform) BuildOverlays(cam.transform);
            FitToView(cam);

            float t = body.Model.TempF;
            float heat = Mathf.InverseLerp(HeatModel.StressF, HeatModel.StrokeF, t);

            if (body.Running && t >= HeatModel.StressF && Time.time >= nextBeat)
            {
                float bpm = Mathf.Clamp(body.Model.PulseBpm, 60f, 170f);
                audioSource.PlayOneShot(heartbeat, Mathf.Lerp(0.2f, 1f, heat));
                nextBeat = Time.time + 60f / bpm;
                beatGlow = 1f;
            }
            beatGlow = Mathf.MoveTowards(beatGlow, 0f, Time.deltaTime * 4f);

            float alpha;
            if (t < HeatModel.StressF) alpha = 0f;
            else if (t < HeatModel.ExhaustionF) alpha = 0.35f * Mathf.InverseLerp(HeatModel.StressF, HeatModel.ExhaustionF, t);
            else alpha = 0.35f + 0.55f * Mathf.InverseLerp(HeatModel.ExhaustionF, HeatModel.StrokeF, t);
            if (t >= HeatModel.ExhaustionF) alpha += 0.12f * beatGlow;

            var tint = Color.Lerp(new Color(1f, 0.6f, 0.15f), new Color(0.6f, 0.02f, 0f), heat);
            vignette.color = new Color(tint.r, tint.g, tint.b, Mathf.Clamp01(alpha));
            vignetteQuad.gameObject.SetActive(alpha > 0.001f);

            fadeAmount = Mathf.MoveTowards(fadeAmount, fadeTarget, Time.deltaTime * 0.6f);
            fade.color = new Color(0.12f, 0f, 0f, fadeAmount);
            fadeQuad.gameObject.SetActive(fadeAmount > 0.001f);
        }

        void BuildOverlays(Transform head)
        {
            if (overlays != null) Destroy(overlays.gameObject);
            overlays = new GameObject("Screen overlays").transform;
            overlays.SetParent(head, false);
            vignetteQuad = Quad("Vignette", vignette);
            fadeQuad = Quad("Fade", fade);
        }

        Transform Quad(string name, Material material)
        {
            var quad = Make.Primitive(PrimitiveType.Quad, name, overlays, new Vector3(0f, 0f, OverlayDistance), Vector3.one, material);
            Make.RemoveCollider(quad);
            var r = quad.GetComponent<Renderer>();
            r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            r.receiveShadows = false;
            return quad.transform;
        }

        void FitToView(Camera cam)
        {
            float height = 2f * OverlayDistance * Mathf.Tan(cam.fieldOfView * 0.5f * Mathf.Deg2Rad) * 1.08f;
            float width = height * Mathf.Max(cam.aspect, 1f);
            vignetteQuad.localScale = new Vector3(width, height, 1f);
            fadeQuad.localScale = new Vector3(width * 1.5f, height * 1.5f, 1f);
        }

        static Texture2D MakeVignetteTexture()
        {
            const int size = 128;
            var tex = new Texture2D(size, size, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp };
            var pixels = new Color32[size * size];
            for (int y = 0; y < size; y++)
            for (int x = 0; x < size; x++)
            {
                float u = (x + 0.5f) / size * 2f - 1f;
                float v = (y + 0.5f) / size * 2f - 1f;
                float r = Mathf.Sqrt(u * u + v * v) / 1.2f;
                float a = Mathf.SmoothStep(0f, 1f, Mathf.InverseLerp(0.35f, 1f, r));
                pixels[y * size + x] = new Color32(255, 255, 255, (byte)(a * 255f));
            }
            tex.SetPixels32(pixels);
            tex.Apply();
            return tex;
        }

        // Two low thumps, "lub-dub", made in code so the project doesn't need any audio files.
        static AudioClip MakeHeartbeat()
        {
            const int rate = 44100;
            int length = (int)(rate * 0.55f);
            var data = new float[length];
            for (int i = 0; i < length; i++)
            {
                float t = (float)i / rate;
                data[i] = Thump(t, 0f, 0.9f, 52f) + Thump(t, 0.24f, 0.6f, 60f);
            }
            var clip = AudioClip.Create("Heartbeat", length, 1, rate, false);
            clip.SetData(data, 0);
            return clip;
        }

        static float Thump(float t, float start, float amplitude, float hz)
        {
            float x = t - start;
            if (x < 0f) return 0f;
            float envelope = (1f - Mathf.Exp(-x * 300f)) * Mathf.Exp(-x * 16f);
            return amplitude * envelope * Mathf.Sin(2f * Mathf.PI * hz * x);
        }
    }
}
