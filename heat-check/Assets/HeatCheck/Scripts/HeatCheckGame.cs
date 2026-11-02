using UnityEngine;

namespace HeatCheck
{
    /// <summary>
    /// Runs one round: move all the boxes from the truck to the porch without letting your body overheat.
    /// </summary>
    [RequireComponent(typeof(Body))]
    public sealed class HeatCheckGame : MonoBehaviour
    {
        public enum Phase
        {
            Playing,
            Finished,
            Collapsed,
        }

        [SerializeField] BoxPile pile;
        [SerializeField] Porch porch;
        [SerializeField] DesktopPlayer desktopPlayer;
        [SerializeField] BodyPanel panel;
        [SerializeField] HeatEffects effects;

        public Body Body { get; private set; }
        public Phase State { get; private set; }
        public bool Playing => State == Phase.Playing;
        public bool IsXR { get; private set; }
        public int TotalBoxes { get; private set; }
        public int Delivered { get; private set; }
        public int BoxesAtTruck => TotalBoxes - Delivered - (Body.Carrying ? 1 : 0);
        public float ElapsedSeconds { get; private set; }

        /// <summary>The thing the player is looking or pointing at, if any.</summary>
        public Interactable Focus => xrFocus != null ? xrFocus : desktopPlayer != null && !IsXR ? desktopPlayer.Focus : null;

        Interactable xrFocus;
        GameObject carriedBox;
        GameObject endScreen;
        HeatStage shownStage;
        bool warnedWater;

        void Awake()
        {
            Body = GetComponent<Body>();
            TotalBoxes = pile != null ? pile.Count : 0;

            IsXR = XRSupport.RigInScene();
            if (IsXR && desktopPlayer != null) desktopPlayer.gameObject.SetActive(false);

            if (XRSupport.Installed)
                foreach (var item in FindObjectsByType<Interactable>(FindObjectsInactive.Include, FindObjectsSortMode.None))
                    XRSupport.Hook(item, this);
        }

        void Start() => Restart();

        public void Restart()
        {
            if (endScreen != null) Destroy(endScreen);
            DropCarriedBox();

            Body.ResetBody();
            Body.Running = true;
            Delivered = 0;
            ElapsedSeconds = 0f;
            shownStage = HeatStage.Normal;
            warnedWater = false;
            State = Phase.Playing;

            if (pile != null) pile.Show(TotalBoxes);
            if (porch != null) porch.Show(0);
            if (desktopPlayer != null && desktopPlayer.isActiveAndEnabled) desktopPlayer.ReturnToStart();
            if (effects != null) effects.FadeTo(0f);

            Say(
                "Lubbock, 3:00 PM. It's 104°F.\n"
                    + $"Move {TotalBoxes} boxes from the truck to the porch.\n"
                    + "Keep an eye on your body.",
                9f);
        }

        void Update()
        {
            if (!Playing) return;
            ElapsedSeconds += Time.deltaTime;

            var model = Body.Model;
            var stage = model.Stage;

            if (stage == HeatStage.HeatStroke)
            {
                Collapse();
                return;
            }

            if (stage > shownStage) Warn(stage);
            else if (stage == HeatStage.Normal && shownStage != HeatStage.Normal)
                Say("Your temperature is back to normal.", 4f);
            shownStage = stage;

            if (!warnedWater && model.Water < 0.4f)
            {
                warnedWater = true;
                Say("You're running low on water.\nThere's a cooler under the tree.", 6f);
            }
            if (model.Water > 0.6f) warnedWater = false;
        }

        void Warn(HeatStage stage)
        {
            if (stage == HeatStage.HeatStress)
                Say(
                    "You're sweating a lot and getting thirsty.\n"
                        + "Those are early warning signs. Drink water and take a break in the shade.",
                    7f);
            else if (stage == HeatStage.HeatExhaustion)
                Say(
                    "<color=#ff6b5a>Heat exhaustion.</color>\n"
                        + "Dizziness, headache, nausea, cramps, a fast weak pulse.\n"
                        + "Stop working. Get into the AC or the shade and sip water.",
                    9f);
        }

        public void PickUpBox()
        {
            if (!Playing || Body.Carrying || BoxesAtTruck == 0) return;
            Body.Carrying = true;
            if (pile != null) pile.Show(BoxesAtTruck);
            HoldBox();
        }

        public void DeliverBox()
        {
            if (!Playing || !Body.Carrying) return;
            DropCarriedBox();
            Delivered++;
            if (porch != null) porch.Show(Delivered);
            if (pile != null) pile.Show(BoxesAtTruck);

            if (Delivered >= TotalBoxes) Finish();
            else Say($"{Delivered} of {TotalBoxes} done.", 2.5f);
        }

        public void Drink()
        {
            if (!Playing) return;
            Body.Drink();
            Say("You drink a cup of cold water.", 2.5f);
        }

        void Say(string message, float seconds)
        {
            if (panel != null) panel.Flash(message, seconds);
        }

        public void SetXRFocus(Interactable target) => xrFocus = target;

        public void ClearXRFocus(Interactable target)
        {
            if (xrFocus == target) xrFocus = null;
        }

        void HoldBox()
        {
            var head = Player.Head;
            if (head == null) return;
            carriedBox = Make.Cube("Carried box", head, new Vector3(0f, -0.38f, 0.55f), Vector3.one * 0.45f, pile != null ? pile.BoxMaterial : null);
            Make.RemoveCollider(carriedBox);
        }

        void DropCarriedBox()
        {
            Body.Carrying = false;
            if (carriedBox != null) Destroy(carriedBox);
            carriedBox = null;
        }

        void Finish()
        {
            State = Phase.Finished;
            Body.Running = false;

            var m = Body.Model;
            string verdict;
            if (m.PeakF < HeatModel.StressF)
                verdict = "You stayed cool the whole time.\nThat's what pacing yourself looks like.";
            else if (m.PeakF < HeatModel.ExhaustionF)
                verdict = "You got hot, but you kept it under control.\nWater and breaks made the difference.";
            else
                verdict = "You finished, but you pushed through heat exhaustion.\n"
                    + "In real life that's when people collapse.\nStop at the first signs.";

            ShowEnd(
                "<b>All boxes moved</b>\n\n"
                    + $"Time: {Clock(ElapsedSeconds)}\n"
                    + $"Highest body temperature: {m.PeakF:0.0}°F\n"
                    + $"Cups of water: {Body.Drinks}\n"
                    + $"Time in shade or AC: {Clock(Body.CoolSeconds)}\n\n"
                    + verdict,
                new Color(0.75f, 1f, 0.75f));
        }

        void Collapse()
        {
            State = Phase.Collapsed;
            Body.Running = false;
            DropCarriedBox();
            if (effects != null) effects.FadeTo(0.85f);

            ShowEnd(
                "<b>HEAT STROKE</b>\n\n"
                    + "Your body couldn't cool itself anymore.\n"
                    + "In real life this is a medical emergency.\n\n"
                    + "If you see it: call 911, move the person somewhere cool,\n"
                    + "cool them with wet cloths or a cool bath,\n"
                    + "and don't give them anything to drink.\n\n"
                    + $"Boxes moved: {Delivered} of {TotalBoxes}",
                new Color(1f, 0.82f, 0.78f));
        }

        void ShowEnd(string text, Color color)
        {
            if (panel != null) panel.Clear();
            var head = Player.Head;
            if (head == null) return;

            var flat = Vector3.ProjectOnPlane(head.forward, Vector3.up);
            if (flat.sqrMagnitude < 0.01f) flat = Vector3.forward;
            flat.Normalize();

            endScreen = new GameObject("End screen");
            endScreen.transform.SetPositionAndRotation(
                head.position + flat * 1.6f + Vector3.up * 0.1f,
                Quaternion.LookRotation(flat));

            var textMaterial = Make.OverlayTextMaterial();
            var hint = IsXR ? "Point at the button below and press grip to try again." : "Press R to try again.";
            Make.Text("Text", endScreen.transform, Vector3.zero, text + "\n\n" + hint, 0.055f, color, TextAnchor.MiddleCenter, textMaterial);

            if (IsXR)
            {
                var button = Make.Cube("Try again", endScreen.transform, new Vector3(0f, -0.75f, 0f), new Vector3(0.5f, 0.16f, 0.05f), Make.Lit(new Color(0.95f, 0.55f, 0.15f)));
                Make.Text("Button label", endScreen.transform, new Vector3(0f, -0.75f, -0.03f), "Try again", 0.07f, Color.white, TextAnchor.MiddleCenter, textMaterial);
                XRSupport.Hook(button.AddComponent<RestartButton>(), this);
            }
        }

        static string Clock(float seconds)
        {
            int s = Mathf.RoundToInt(seconds);
            return $"{s / 60}:{s % 60:00}";
        }
    }
}
