using UnityEngine;

namespace HeatCheck
{
    /// <summary>
    /// Finds the player's head, whether that's the desktop camera or the headset camera on an XR Origin.
    /// </summary>
    public static class Player
    {
        static Camera cached;

        public static Camera Camera
        {
            get
            {
                if (cached == null || !cached.isActiveAndEnabled) cached = Camera.main;
                return cached;
            }
        }

        public static Transform Head
        {
            get
            {
                var cam = Camera;
                return cam != null ? cam.transform : null;
            }
        }
    }
}
