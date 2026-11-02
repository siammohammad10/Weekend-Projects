using System.Collections.Generic;
using UnityEngine;

namespace HeatCheck
{
    /// <summary>An air-conditioned room. Anyone whose head is inside this box counts as indoors.</summary>
    public sealed class IndoorZone : MonoBehaviour
    {
        static readonly List<IndoorZone> zones = new List<IndoorZone>();

        [SerializeField] Vector3 size = new Vector3(4f, 3f, 4f);

        public Vector3 Size
        {
            get => size;
            set => size = value;
        }

        void OnEnable() => zones.Add(this);

        void OnDisable() => zones.Remove(this);

        public bool Contains(Vector3 point)
        {
            var local = transform.InverseTransformPoint(point);
            return Mathf.Abs(local.x) <= size.x / 2f && Mathf.Abs(local.y) <= size.y / 2f && Mathf.Abs(local.z) <= size.z / 2f;
        }

        public static bool Any(Vector3 point)
        {
            foreach (var zone in zones)
                if (zone.Contains(point)) return true;
            return false;
        }

        void OnDrawGizmos()
        {
            Gizmos.color = new Color(0.3f, 0.7f, 1f, 0.35f);
            Gizmos.matrix = transform.localToWorldMatrix;
            Gizmos.DrawWireCube(Vector3.zero, size);
        }
    }
}
