using UnityEngine;

namespace HeatCheck
{
    /// <summary>The spot on the porch where boxes go. Delivered boxes appear in the stack under this object.</summary>
    public sealed class Porch : Interactable
    {
        [SerializeField] Transform stack;

        public void Show(int delivered)
        {
            if (stack == null) return;
            for (int i = 0; i < stack.childCount; i++) stack.GetChild(i).gameObject.SetActive(i < delivered);
        }

        public override string Prompt(HeatCheckGame game)
        {
            if (!game.Playing || !game.Body.Carrying) return null;
            return "Put the box down";
        }

        public override void Use(HeatCheckGame game) => game.DeliverBox();
    }
}
