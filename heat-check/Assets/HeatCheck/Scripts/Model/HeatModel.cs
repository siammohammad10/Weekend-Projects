using System;

namespace HeatCheck
{
    public enum HeatStage
    {
        Normal,
        HeatStress,
        HeatExhaustion,
        HeatStroke,
    }

    public enum Surroundings
    {
        Sun,
        Shade,
        Indoors,
    }

    /// <summary>
    /// A simple model of body temperature and water on a hot afternoon.
    /// Time is sped up so a whole afternoon fits into a few minutes. It's meant to show cause and
    /// effect (sun, work, water, shade), not to predict anyone's real body temperature.
    /// This file has no Unity dependencies, so the tests can run it with plain .NET or Mono.
    /// </summary>
    public sealed class HeatModel
    {
        public const float NormalF = 98.6f;
        public const float StressF = 100f;
        public const float ExhaustionF = 101.5f;

        // The CDC lists 103°F or higher as a sign of heat stroke.
        public const float StrokeF = 103f;

        // Heat taken in, in °F per second.
        public float SunGain = 0.03f;
        public float ShadeGain = 0.003f;
        public float CarryGain = 0.04f;

        // How strongly sweating pulls temperature back toward normal, per second, with full water.
        public float SweatCooling = 0.01f;

        // Extra pull toward normal from resting in the shade, and from air conditioning.
        public float ShadeCooling = 0.03f;
        public float AirConCooling = 0.06f;

        // Water lost per second, as a fraction of full.
        public float SunSweat = 0.004f;
        public float ShadeSweat = 0.001f;
        public float IndoorSweat = 0.0005f;
        public float CarrySweat = 0.003f;

        public float DrinkAmount = 0.35f;

        public float TempF { get; private set; }
        public float Water { get; private set; }
        public float PeakF { get; private set; }

        public HeatStage Stage => StageFor(TempF);

        // Heart rate goes up with body temperature and with dehydration.
        public float PulseBpm => 75f + 16f * (TempF - NormalF) + 20f * (1f - Water);

        public HeatModel()
        {
            Reset();
        }

        public static HeatStage StageFor(float tempF)
        {
            if (tempF >= StrokeF) return HeatStage.HeatStroke;
            if (tempF >= ExhaustionF) return HeatStage.HeatExhaustion;
            if (tempF >= StressF) return HeatStage.HeatStress;
            return HeatStage.Normal;
        }

        public void Reset()
        {
            TempF = NormalF;
            Water = 1f;
            PeakF = NormalF;
        }

        public void Step(float dt, Surroundings where, bool carrying)
        {
            if (dt <= 0f) return;

            float gain = where == Surroundings.Sun ? SunGain : where == Surroundings.Shade ? ShadeGain : 0f;
            if (carrying) gain += CarryGain;

            // A dehydrated body sweats less, so it heats up faster and cools down slower.
            float cooling = SweatCooling * (0.25f + 0.75f * Water);
            if (where == Surroundings.Shade) cooling += ShadeCooling;
            if (where == Surroundings.Indoors) cooling += AirConCooling;

            TempF += (gain - cooling * (TempF - NormalF)) * dt;
            if (TempF < NormalF) TempF = NormalF;
            if (TempF > PeakF) PeakF = TempF;

            float loss = where == Surroundings.Sun ? SunSweat : where == Surroundings.Shade ? ShadeSweat : IndoorSweat;
            if (carrying) loss += CarrySweat;
            Water = Math.Max(0f, Water - loss * dt);
        }

        public void Drink()
        {
            Water = Math.Min(1f, Water + DrinkAmount);
        }
    }
}
