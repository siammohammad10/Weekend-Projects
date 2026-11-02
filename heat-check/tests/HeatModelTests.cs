using System;
using System.Collections.Generic;
using HeatCheck;

// Checks that the heat model tells the story the experience is built around:
// working straight through in the sun ends badly, and water plus short breaks keep you safe.
// Run with ./run-tests.sh (needs Mono or .NET), no Unity required.
static class HeatModelTests
{
    // The walk in the scene: about 24 m from the truck to the porch.
    const float Distance = 24.3f;
    const float CarrySpeed = 2.2f;
    const float WalkSpeed = 3f;
    const float Dt = 0.05f;

    static int failed;
    static readonly List<string> log = new List<string>();

    static void Run(float seconds, HeatModel m, Surroundings where, bool carrying)
    {
        for (float t = 0; t < seconds; t += Dt) m.Step(Dt, where, carrying);
    }

    static void Check(string name, bool ok, string detail)
    {
        log.Add((ok ? "  ok    " : "  FAIL  ") + name + "  (" + detail + ")");
        if (!ok) failed++;
    }

    // Moves boxes one at a time. Returns how many got delivered before heat stroke.
    static int Work(HeatModel m, int loads, int breakEvery, float restSeconds)
    {
        for (int i = 1; i <= loads; i++)
        {
            Run(Distance / CarrySpeed, m, Surroundings.Sun, true);
            if (m.Stage == HeatStage.HeatStroke) return i - 1;
            Run(Distance / WalkSpeed, m, Surroundings.Sun, false);
            if (breakEvery > 0 && i % breakEvery == 0 && i < loads)
            {
                m.Drink();
                Run(restSeconds, m, Surroundings.Shade, false);
            }
        }
        return loads;
    }

    static int Main()
    {
        var m = new HeatModel();
        Check("starts at normal temperature", m.TempF == HeatModel.NormalF && m.Water == 1f, m.TempF + "°F");

        Check("stage thresholds",
            HeatModel.StageFor(99f) == HeatStage.Normal &&
            HeatModel.StageFor(100.2f) == HeatStage.HeatStress &&
            HeatModel.StageFor(102f) == HeatStage.HeatExhaustion &&
            HeatModel.StageFor(103f) == HeatStage.HeatStroke, "100 / 101.5 / 103");

        m = new HeatModel();
        Run(600, m, Surroundings.Indoors, false);
        Check("ten minutes indoors stays normal", m.Stage == HeatStage.Normal, m.TempF.ToString("0.00") + "°F");

        m = new HeatModel();
        Run(600, m, Surroundings.Shade, false);
        Check("resting in the shade stays normal", m.Stage == HeatStage.Normal, m.TempF.ToString("0.00") + "°F");

        m = new HeatModel();
        Run(45, m, Surroundings.Sun, false);
        Check("standing in the sun for 45 s is still fine", m.Stage == HeatStage.Normal, m.TempF.ToString("0.00") + "°F");

        m = new HeatModel();
        int done = Work(m, 8, 0, 0);
        Check("working straight through ends in heat stroke", done < 8 && m.Stage == HeatStage.HeatStroke,
            "collapsed after " + done + " of 8 boxes, " + m.TempF.ToString("0.00") + "°F");
        Check("but not right away", done >= 4, done + " boxes first");

        m = new HeatModel();
        done = Work(m, 8, 2, 20);
        Check("water and a 20 s shade break every 2 boxes finishes safely",
            done == 8 && m.PeakF < HeatModel.ExhaustionF,
            "peak " + m.PeakF.ToString("0.00") + "°F, water " + (m.Water * 100).ToString("0") + "%");

        m = new HeatModel();
        done = Work(m, 8, 3, 0);
        Check("only drinking, no rest, gets into heat exhaustion", m.PeakF >= HeatModel.ExhaustionF,
            "peak " + m.PeakF.ToString("0.00") + "°F, " + done + " boxes");

        m = new HeatModel();
        Work(m, 5, 0, 0);
        float before = m.TempF;
        Run(45, m, Surroundings.Indoors, false);
        Check("45 s in the AC brings you back under heat stress", m.TempF < HeatModel.StressF,
            before.ToString("0.00") + " -> " + m.TempF.ToString("0.00") + "°F");

        m = new HeatModel();
        Run(60, m, Surroundings.Sun, true);
        float hydrated = m.TempF;
        var dry = DrainedModel();
        Run(60, dry, Surroundings.Sun, true);
        Check("dehydrated bodies heat up faster", dry.TempF > hydrated,
            hydrated.ToString("0.00") + " vs " + dry.TempF.ToString("0.00") + "°F");

        m = new HeatModel();
        Run(100, m, Surroundings.Sun, false);
        m.Drink();
        m.Drink();
        m.Drink();
        Check("water never goes above 100%", m.Water <= 1f, (m.Water * 100).ToString("0") + "%");

        m = new HeatModel();
        Check("resting pulse is normal", m.PulseBpm >= 60 && m.PulseBpm <= 90, m.PulseBpm.ToString("0") + " bpm");

        foreach (var line in log) Console.WriteLine(line);
        Console.WriteLine(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        return failed == 0 ? 0 : 1;
    }

    // Normal temperature, but with about half the water gone.
    static HeatModel DrainedModel()
    {
        var m = new HeatModel { SunGain = 0f, ShadeGain = 0f };
        Run(500, m, Surroundings.Shade, false);
        var defaults = new HeatModel();
        m.SunGain = defaults.SunGain;
        m.ShadeGain = defaults.ShadeGain;
        return m;
    }
}
