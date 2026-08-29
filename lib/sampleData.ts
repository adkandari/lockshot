import { AppData } from "./types";

export const HABIT_APP: AppData = {
  name: "Habit",
  slides: [
    {
      id: 1,
      templateId: "gradient",
      backgroundImage: "/assets/habit-1.png",
      overlays: {
        en: {
          headline: "Build Better Habits",
          subhead: "Track your daily progress",
        },
        de: {
          headline: "Erstellen Sie bessere Gewohnheiten mit unserem System",
          subhead: "Verfolgen Sie Ihren täglichen Fortschritt jeden Tag",
        },
        es: {
          headline: "Construye Mejores Hábitos",
          subhead: "Rastrea tu progreso diario",
        },
        ja: {
          headline: "より良い習慣を築く",
          subhead: "毎日の進捗を追跡",
        },
      },
      locked: false,
      comments: [],
      overflow: {
        en: false,
        de: true,
        es: false,
        ja: false,
      },
    },
    {
      id: 2,
      templateId: "framed",
      backgroundImage: "/assets/habit-2.png",
      overlays: {
        en: {
          headline: "Stay Consistent",
          subhead: "Visual streaks motivate",
        },
        de: {
          headline: "Bleiben Sie konsequent mit Ihrer Routine",
          subhead: "Visuelle Streaks motivieren Sie jeden Tag",
        },
        es: {
          headline: "Mantén la Consistencia",
          subhead: "Las rachas visuales motivan",
        },
        ja: {
          headline: "一貫性を保つ",
          subhead: "ビジュアルストリークがモチベーション",
        },
      },
      locked: false,
      comments: [],
      overflow: {
        en: false,
        de: true,
        es: false,
        ja: false,
      },
    },
    {
      id: 3,
      templateId: "gradient",
      backgroundImage: "/assets/habit-3.png",
      overlays: {
        en: {
          headline: "Smart Reminders",
          subhead: "Never miss a day",
        },
        de: {
          headline: "Intelligente Erinnerungen für Ihre Gewohnheiten",
          subhead: "Verpassen Sie niemals einen einzigen Tag",
        },
        es: {
          headline: "Recordatorios Inteligentes",
          subhead: "Nunca pierdas un día",
        },
        ja: {
          headline: "スマートリマインダー",
          subhead: "1日も逃さない",
        },
      },
      locked: false,
      comments: [],
      overflow: {
        en: false,
        de: true,
        es: false,
        ja: false,
      },
    },
    {
      id: 4,
      templateId: "framed",
      backgroundImage: "/assets/habit-4.png",
      overlays: {
        en: {
          headline: "Beautiful Charts",
          subhead: "See your progress grow",
        },
        de: {
          headline: "Wunderschöne Diagramme für Ihre Fortschritte",
          subhead: "Sehen Sie Ihren Fortschritt jeden Tag wachsen",
        },
        es: {
          headline: "Gráficas Hermosas",
          subhead: "Ve tu progreso crecer",
        },
        ja: {
          headline: "美しいチャート",
          subhead: "進捗の成長を確認",
        },
      },
      locked: false,
      comments: [],
      overflow: {
        en: false,
        de: true,
        es: false,
        ja: false,
      },
    },
    {
      id: 5,
      templateId: "gradient",
      backgroundImage: "/assets/habit-5.png",
      overlays: {
        en: {
          headline: "Achieve Your Goals",
          subhead: "One day at a time",
        },
        de: {
          headline: "Erreichen Sie Ihre persönlichen Ziele nachhaltig",
          subhead: "Einen Tag nach dem anderen mit unserem System",
        },
        es: {
          headline: "Alcanza Tus Metas",
          subhead: "Un día a la vez",
        },
        ja: {
          headline: "目標を達成する",
          subhead: "一日ずつ着実に",
        },
      },
      locked: false,
      comments: [],
      overflow: {
        en: false,
        de: true,
        es: false,
        ja: false,
      },
    },
  ],
};

export const LOCALES = [
  { code: "en" as const, name: "English", flag: "🇺🇸" },
  { code: "de" as const, name: "Deutsch", flag: "🇩🇪" },
  { code: "es" as const, name: "Español", flag: "🇪🇸" },
  { code: "ja" as const, name: "日本語", flag: "🇯🇵" },
];
