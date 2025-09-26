# Dumpster Fire 📸🔥

Dumpster Fire is a mobile app built with TypeScript, React Native and Expo, designed for group-based photo sharing and social games. The app enables users to join or create groups, receive daily photo prompts, and upload photos in response. Once all group members have submitted their photos, the app initiates a game activity using the submitted images. The app offers a photo DUMP with Google Gemini to generate funny captions and stories from a weeks worth of photos.

## Key Features

- **Group Photo Sharing:** Join or create groups and share photos based on daily prompts.
- **Daily Prompts:** Receive a creative or funny prompt each day to inspire your photo submissions.
- **Game Activities:** After all group members submit photos, play a group activity (e.g., voting on the best photo, writing captions for others' photos).
- **AI-Generated Weekly Photo Dumps:** Uses Google Gemini AI to generate humorous captions or stories for the group's weekly photos.
- **Progress Tracking:** Visual indicators show group progress (e.g., how many members have submitted photos or completed activities).
- **Profile & Stats:** View your activity, group memberships, and stats in your profile.

## Technical Stack

- **Frontend:** React Native (Expo), TypeScript
- **Backend:** Appwrite (authentication, database, and storage)
- **AI Integration:** Google Generative AI (Gemini)
- **Other Libraries:** Expo Camera, Expo Image Picker, Expo Media Library, React Navigation, and more.

## How It Works

1. **Join/Create a Group:** Users can join existing groups or create new ones.
2. **Receive Daily Prompt:** Each day, a new prompt is provided (e.g., "Show us your workspace").
3. **Submit Photo:** Take or select a photo and upload it to your group(s).
4. **Wait for Group:** Once all group members have submitted, the app starts a game (e.g., voting, captioning).
5. **AI Fun:** For some activities, the app uses AI to generate funny captions or stories for the photos.
6. **View Results:** After the activity, results are released to the group.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the app:
   ```bash
   npx expo start
   ```
3. Follow the prompts to run on your device or emulator.

---

This project was created for SpurHacks and is open to contributions and feedback! 