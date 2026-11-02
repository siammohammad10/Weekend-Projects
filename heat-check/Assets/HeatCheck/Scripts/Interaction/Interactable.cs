using UnityEngine;

namespace HeatCheck
{
    /// <summary>
    /// Something the player can use: press E while looking at it on desktop, or point and press grip in XR.
    /// </summary>
    public abstract class Interactable : MonoBehaviour
    {
        /// <summary>What using it would do right now, like "Drink water". Null means it can't be used right now.</summary>
        public abstract string Prompt(HeatCheckGame game);

        public abstract void Use(HeatCheckGame game);

        public bool TryUse(HeatCheckGame game)
        {
            if (game == null || Prompt(game) == null) return false;
            Use(game);
            return true;
        }
    }
}
