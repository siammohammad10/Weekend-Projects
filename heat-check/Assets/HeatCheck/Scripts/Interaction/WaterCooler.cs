using UnityEngine;

namespace HeatCheck
{
    public sealed class WaterCooler : Interactable
    {
        [SerializeField] float cooldown = 2f;

        float readyAt;

        public override string Prompt(HeatCheckGame game)
        {
            if (!game.Playing) return null;
            if (Time.time < readyAt) return "Drinking...";
            return game.Body.Model.Water >= 0.99f ? "Drink water (you're not thirsty)" : "Drink water";
        }

        public override void Use(HeatCheckGame game)
        {
            if (Time.time < readyAt) return;
            readyAt = Time.time + cooldown;
            game.Drink();
        }
    }
}
