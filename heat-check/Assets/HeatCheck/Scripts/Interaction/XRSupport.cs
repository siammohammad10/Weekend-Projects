using UnityEngine;
#if HEATCHECK_XRI
using Unity.XR.CoreUtils;
using UnityEngine.XR.Interaction.Toolkit.Interactables;
#endif

namespace HeatCheck
{
    /// <summary>
    /// Connects the game to the XR Interaction Toolkit when it's installed. Without the package this
    /// compiles to nothing and the desktop player is used instead. HEATCHECK_XRI is defined in
    /// HeatCheck.asmdef when com.unity.xr.interaction.toolkit 3.0 or newer is in the project.
    /// </summary>
    public static class XRSupport
    {
        public static bool Installed
        {
            get
            {
#if HEATCHECK_XRI
                return true;
#else
                return false;
#endif
            }
        }

        public static bool RigInScene()
        {
#if HEATCHECK_XRI
            return Object.FindFirstObjectByType<XROrigin>() != null;
#else
            return false;
#endif
        }

        /// <summary>Lets XR controllers point at <paramref name="target"/> and use it with the grip button.</summary>
        public static void Hook(Interactable target, HeatCheckGame game)
        {
#if HEATCHECK_XRI
            var xr = target.GetComponent<XRSimpleInteractable>();
            if (xr == null) xr = target.gameObject.AddComponent<XRSimpleInteractable>();
            xr.hoverEntered.AddListener(_ => game.SetXRFocus(target));
            xr.hoverExited.AddListener(_ => game.ClearXRFocus(target));
            xr.selectEntered.AddListener(_ => target.TryUse(game));
#endif
        }
    }
}
