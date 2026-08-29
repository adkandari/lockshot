import { AppData } from "./types";

export const HABIT_APP: AppData = {
  name: "Habit",
  slides: [
    {
      id: 1,
      templateId: "full_bleed_caption_bottom",
      backgroundImage: "/assets/habit-1.png",
      overlays: {
        en: {
          headline: "Build Better Habits",
          subhead: "Track your daily progress",
        },
      },
      locked: false,
      comments: [],
      overflow: {
        en: false,
      },
    },
    {
      id: 2,
      templateId: "caption_top",
      backgroundImage: "/assets/habit-2.png",
      overlays: {
        en: {
          headline: "Stay Consistent",
          subhead: "Visual streaks motivate",
        },
      },
      locked: false,
      comments: [],
      overflow: {
        en: false,
      },
    },
    {
      id: 3,
      templateId: "framed_on_gradient",
      backgroundImage: "/assets/habit-3.png",
      overlays: {
        en: {
          headline: "Smart Reminders",
          subhead: "Never miss a day",
        },
      },
      locked: false,
      comments: [],
      overflow: {
        en: false,
      },
    },
    {
      id: 4,
      templateId: "full_bleed_caption_bottom",
      backgroundImage: "/assets/habit-4.png",
      overlays: {
        en: {
          headline: "Beautiful Charts",
          subhead: "See your progress grow",
        },
      },
      locked: false,
      comments: [],
      overflow: {
        en: false,
      },
    },
    {
      id: 5,
      templateId: "gradient_only",
      backgroundImage: "/assets/habit-5.png",
      overlays: {
        en: {
          headline: "Achieve Your Goals",
          subhead: "One day at a time",
        },
      },
      locked: false,
      comments: [],
      overflow: {
        en: false,
      },
    },
  ],
};
