namespace HeatCheck
{
    /// <summary>The "Try again" button on the end screen, for headsets with no keyboard.</summary>
    public sealed class RestartButton : Interactable
    {
        public override string Prompt(HeatCheckGame game) => game.Playing ? null : "Try again";

        public override void Use(HeatCheckGame game) => game.Restart();
    }
}
