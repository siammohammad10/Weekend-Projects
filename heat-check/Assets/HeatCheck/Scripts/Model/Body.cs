using UnityEngine;

namespace HeatCheck
{
    /// <summary>
    /// Works out whether the player is in the sun, in the shade or indoors, and runs the heat model.
    /// Shade is real: a ray goes from the player's head toward the sun, and if anything blocks it
    /// (the tree, the porch roof, the truck) you're in the shade.
    /// </summary>
    public sealed class Body : MonoBehaviour
    {
        [SerializeField] Light sun;

        public HeatModel Model { get; } = new HeatModel();
        public Surroundings Where { get; private set; }
        public bool Carrying { get; set; }
        public bool Running { get; set; }
        public float CoolSeconds { get; private set; }
        public int Drinks { get; private set; }

        public void ResetBody()
        {
            Model.Reset();
            Carrying = false;
            CoolSeconds = 0f;
            Drinks = 0;
        }

        public void Drink()
        {
            Model.Drink();
            Drinks++;
        }

        void Update()
        {
            var head = Player.Head;
            if (head == null) return;

            Where = Sense(head.position);
            if (!Running) return;

            Model.Step(Time.deltaTime, Where, Carrying);
            if (Where != Surroundings.Sun) CoolSeconds += Time.deltaTime;
        }

        public Surroundings Sense(Vector3 point)
        {
            if (IndoorZone.Any(point)) return Surroundings.Indoors;
            if (sun != null && Physics.Raycast(point, -sun.transform.forward, 100f, ~0, QueryTriggerInteraction.Ignore))
                return Surroundings.Shade;
            return Surroundings.Sun;
        }
    }
}
