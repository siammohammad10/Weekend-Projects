using UnityEngine;

namespace HeatCheck
{
    /// <summary>The boxes waiting at the back of the truck. Each child is one box.</summary>
    public sealed class BoxPile : Interactable
    {
        public int Count => transform.childCount;

        public Material BoxMaterial
        {
            get
            {
                var box = transform.childCount > 0 ? transform.GetChild(0).GetComponent<Renderer>() : null;
                return box != null ? box.sharedMaterial : null;
            }
        }

        /// <summary>Shows the top <paramref name="remaining"/> boxes and hides the rest.</summary>
        public void Show(int remaining)
        {
            // Boxes are taken from the top of the stack, so the last children disappear first.
            for (int i = 0; i < transform.childCount; i++) transform.GetChild(i).gameObject.SetActive(i < remaining);
        }

        public override string Prompt(HeatCheckGame game)
        {
            if (!game.Playing || game.Body.Carrying || game.BoxesAtTruck == 0) return null;
            return "Pick up a box";
        }

        public override void Use(HeatCheckGame game) => game.PickUpBox();
    }
}
