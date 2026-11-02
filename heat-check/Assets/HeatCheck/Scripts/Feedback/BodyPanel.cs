using UnityEngine;

namespace HeatCheck
{
    /// <summary>
    /// The readout that stays with the player: body temperature, pulse, water, where you are,
    /// what you're looking at, and short messages. On desktop it sits in the corners of the screen.
    /// In a headset it floats a little below eye level and follows your head with a slight lag,
    /// which is easier on the eyes than text glued to your face.
    /// </summary>
    public sealed class BodyPanel : MonoBehaviour
    {
        [SerializeField] HeatCheckGame game;

        const float Distance = 0.9f;

        TextMesh status;
        TextMesh prompt;
        TextMesh message;
        TextMesh crosshair;
        float messageUntil;

        void Awake()
        {
            var material = Make.OverlayTextMaterial();
            status = Make.Text("Status", transform, Vector3.zero, "", 0.032f, Color.white, TextAnchor.UpperLeft, material);
            prompt = Make.Text("Prompt", transform, Vector3.zero, "", 0.03f, Color.white, TextAnchor.UpperCenter, material);
            message = Make.Text("Message", transform, Vector3.zero, "", 0.034f, Color.white, TextAnchor.MiddleCenter, material);
            crosshair = Make.Text("Crosshair", transform, Vector3.zero, "+", 0.03f, new Color(1f, 1f, 1f, 0.6f), TextAnchor.MiddleCenter, material);
        }

        public void Flash(string text, float seconds)
        {
            message.text = text;
            messageUntil = Time.time + seconds;
        }

        public void Clear()
        {
            message.text = "";
            messageUntil = 0f;
        }

        void LateUpdate()
        {
            var cam = Player.Camera;
            if (cam == null) return;
            var head = cam.transform;

            bool playing = game.Playing;
            status.gameObject.SetActive(playing);
            prompt.gameObject.SetActive(playing);
            crosshair.gameObject.SetActive(playing && !game.IsXR);
            if (Time.time > messageUntil) message.text = "";

            if (game.IsXR)
            {
                // Follow the head's position exactly, but turn toward where it's looking a little late.
                transform.position = head.position;
                transform.rotation = Quaternion.Slerp(transform.rotation, head.rotation, 1f - Mathf.Exp(-5f * Time.deltaTime));
                status.anchor = TextAnchor.UpperCenter;
                status.alignment = TextAlignment.Center;
                status.transform.localPosition = new Vector3(0f, -0.28f, Distance);
                prompt.transform.localPosition = new Vector3(0f, -0.12f, Distance);
                message.transform.localPosition = new Vector3(0f, 0.18f, Distance);
            }
            else
            {
                transform.SetPositionAndRotation(head.position, head.rotation);
                float halfHeight = Distance * Mathf.Tan(cam.fieldOfView * 0.5f * Mathf.Deg2Rad);
                float halfWidth = halfHeight * cam.aspect;
                status.transform.localPosition = new Vector3(-halfWidth * 0.94f, halfHeight * 0.92f, Distance);
                prompt.transform.localPosition = new Vector3(0f, -0.04f, Distance);
                message.transform.localPosition = new Vector3(0f, halfHeight * 0.45f, Distance);
                crosshair.transform.localPosition = new Vector3(0f, 0f, Distance);
            }

            if (!playing) return;
            var body = game.Body;
            var m = body.Model;

            status.text =
                $"Body  {Colored(m.TempF.ToString("0.0") + "°F", m.Stage)}\n"
                + $"Pulse  {m.PulseBpm:0} bpm\n"
                + $"Water  {m.Water * 100f:0}%\n"
                + $"{StageName(m.Stage)}\n"
                + $"{WhereName(body.Where)}\n"
                + $"Boxes  {game.Delivered} / {game.TotalBoxes}";

            var focus = game.Focus;
            string what = focus != null ? focus.Prompt(game) : null;
            prompt.text = what == null ? "" : (game.IsXR ? "Grip:  " : "E:  ") + what;
        }

        static string Colored(string text, HeatStage stage)
        {
            string hex = stage == HeatStage.Normal ? "#8fe08f" : stage == HeatStage.HeatStress ? "#ffc14d" : "#ff6b5a";
            return $"<color={hex}>{text}</color>";
        }

        static string StageName(HeatStage stage)
        {
            switch (stage)
            {
                case HeatStage.HeatStress:
                    return Colored("Heat stress", stage);
                case HeatStage.HeatExhaustion:
                case HeatStage.HeatStroke:
                    return Colored("Heat exhaustion", stage);
                default:
                    return Colored("Feeling OK", stage);
            }
        }

        static string WhereName(Surroundings where)
        {
            switch (where)
            {
                case Surroundings.Shade:
                    return "In the shade";
                case Surroundings.Indoors:
                    return "Indoors, in the AC";
                default:
                    return "In direct sun";
            }
        }
    }
}
