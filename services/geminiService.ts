
import { GoogleGenAI, Type } from "@google/genai";
import { WordData } from "../types";

// Initialize lazily to prevent crash on load if key is missing
const getAI = () => {
  const key = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
  if (!key) throw new Error("Missing API Key");
  return new GoogleGenAI({ apiKey: key });
};

// Simplified Local Word List for "Easy Mode" - 100+ Words, 20+ Categories
const LOCAL_WORDS: WordData[] = [
  // 1. Animals
  { word: "TIGER", category: "Animals", hint: "Big striped cat" },
  { word: "LION", category: "Animals", hint: "King of the jungle" },
  { word: "ZEBRA", category: "Animals", hint: "Black and white stripes" },
  { word: "PANDA", category: "Animals", hint: "Bamboo eater" },
  { word: "KOALA", category: "Animals", hint: "Australian tree climber" },
  { word: "EAGLE", category: "Animals", hint: "Flying predator" },
  { word: "SHARK", category: "Animals", hint: "Ocean predator" },
  { word: "WHALE", category: "Animals", hint: "Largest sea mammal" },
  { word: "GIRAFFE", category: "Animals", hint: "Long neck" },
  { word: "MONKEY", category: "Animals", hint: "Banana eater" },

  // 2. Food
  { word: "PIZZA", category: "Food", hint: "Cheesy Italian dish" },
  { word: "BURGER", category: "Food", hint: "Patty in a bun" },
  { word: "SUSHI", category: "Food", hint: "Raw fish and rice" },
  { word: "PASTA", category: "Food", hint: "Noodles with sauce" },
  { word: "TACO", category: "Food", hint: "Mexican shell snack" },
  { word: "BREAD", category: "Food", hint: "Loaf for sandwiches" },
  { word: "APPLE", category: "Food", hint: "Red or green fruit" },
  { word: "GRAIN", category: "Food", hint: "Wheat or rice" },
  { word: "STEAK", category: "Food", hint: "Grilled meat" },
  { word: "SALAD", category: "Food", hint: "Leafy veggie mix" },

  // 3. Tech
  { word: "ROBOT", category: "Tech", hint: "Automated machine" },
  { word: "LAPTOP", category: "Tech", hint: "Portable computer" },
  { word: "PHONE", category: "Tech", hint: "Mobile device" },
  { word: "WIFI", category: "Tech", hint: "Wireless internet" },
  { word: "CODE", category: "Tech", hint: "Program instructions" },
  { word: "DATA", category: "Tech", hint: "Digital information" },
  { word: "MOUSE", category: "Tech", hint: "Clicking device" },
  { word: "SCREEN", category: "Tech", hint: "Display panel" },

  // 4. Space
  { word: "MOON", category: "Space", hint: "Night sky orb" },
  { word: "MARS", category: "Space", hint: "The Red Planet" },
  { word: "STAR", category: "Space", hint: "Burn bright sun" },
  { word: "ORBIT", category: "Space", hint: "Path around a planet" },
  { word: "COMET", category: "Space", hint: "Icy space rock" },
  { word: "EARTH", category: "Space", hint: "Our home planet" },

  // 5. Sports
  { word: "SOCCER", category: "Sports", hint: "Kicking a ball" },
  { word: "TENNIS", category: "Sports", hint: "Racket and court" },
  { word: "RUGBY", category: "Sports", hint: "Oval ball contact" },
  { word: "GOLF", category: "Sports", hint: "Clubs and holes" },
  { word: "SWIM", category: "Sports", hint: "Moving in water" },

  // 6. Colors
  { word: "BLUE", category: "Colors", hint: "Color of the sky" },
  { word: "GREEN", category: "Colors", hint: "Color of grass" },
  { word: "PURPLE", category: "Colors", hint: "Royal color" },
  { word: "ORANGE", category: "Colors", hint: "Fruit color" },
  { word: "YELLOW", category: "Colors", hint: "Sun color" },

  // 7. Nature
  { word: "TREE", category: "Nature", hint: "Tall plant with wood" },
  { word: "RIVER", category: "Nature", hint: "Flowing water" },
  { word: "RAIN", category: "Nature", hint: "Water from clouds" },
  { word: "SNOW", category: "Nature", hint: "Frozen rain" },
  { word: "WIND", category: "Nature", hint: "Moving air" },
  { word: "LEAF", category: "Nature", hint: "Green plant part" },

  // 8. Travel
  { word: "PLANE", category: "Travel", hint: "Flying vehicle" },
  { word: "TRAIN", category: "Travel", hint: "Rail transport" },
  { word: "HOTEL", category: "Travel", hint: "Place to stay" },
  { word: "MAP", category: "Travel", hint: "Guide to locations" },
  { word: "BOAT", category: "Travel", hint: "Water vehicle" },

  // 9. Music
  { word: "PIANO", category: "Music", hint: "Keys instrument" },
  { word: "GUITAR", category: "Music", hint: "Strumming strings" },
  { word: "SONG", category: "Music", hint: "Music with words" },
  { word: "JAZZ", category: "Music", hint: "Smooth genre" },
  { word: "DRUM", category: "Music", hint: "Beat instrument" },

  // 10. House
  { word: "CHAIR", category: "House", hint: "Seat for one" },
  { word: "TABLE", category: "House", hint: "Flat surface" },
  { word: "BED", category: "House", hint: "Sleep here" },
  { word: "DOOR", category: "House", hint: "Entryway" },
  { word: "LAMP", category: "House", hint: "Light source" },

  // 11. Body
  { word: "HAND", category: "Body", hint: "Five fingers" },
  { word: "FEET", category: "Body", hint: "Walk on these" },
  { word: "EYES", category: "Body", hint: "See with these" },
  { word: "HEART", category: "Body", hint: "Beating organ" },
  { word: "NOSE", category: "Body", hint: "Smell with this" },

  // 12. Clothes
  { word: "SHIRT", category: "Clothes", hint: "Upper body wear" },
  { word: "SHOES", category: "Clothes", hint: "Footwear" },
  { word: "HAT", category: "Clothes", hint: "Head covering" },
  { word: "JEANS", category: "Clothes", hint: "Denim pants" },
  { word: "COAT", category: "Clothes", hint: "Warm outer layer" },

  // 13. School
  { word: "BOOK", category: "School", hint: "Read this" },
  { word: "PEN", category: "School", hint: "Write with this" },
  { word: "DESK", category: "School", hint: "Sit and work" },
  { word: "MATH", category: "School", hint: "Numbers study" },
  { word: "CLASS", category: "School", hint: "Group of students" },

  // 14. Weather
  { word: "SUNNY", category: "Weather", hint: "Bright day" },
  { word: "STORM", category: "Weather", hint: "Thunder and lightning" },
  { word: "COLD", category: "Weather", hint: "Low temperature" },
  { word: "HEAT", category: "Weather", hint: "High temperature" },
  { word: "FOG", category: "Weather", hint: "Low cloud" },

  // 15. Jobs
  { word: "CHEF", category: "Jobs", hint: "Cooks food" },
  { word: "DOCTOR", category: "Jobs", hint: "Heals sick people" },
  { word: "PILOT", category: "Jobs", hint: "Flies planes" },
  { word: "ARTIST", category: "Jobs", hint: "Creates art" },
  { word: "NURSE", category: "Jobs", hint: "Medical helper" },

  // 16. Emotions
  { word: "HAPPY", category: "Emotions", hint: "Smiling feeling" },
  { word: "SAD", category: "Emotions", hint: "Crying feeling" },
  { word: "ANGRY", category: "Emotions", hint: "Mad feeling" },
  { word: "LOVE", category: "Emotions", hint: "Deep affection" },
  { word: "FEAR", category: "Emotions", hint: "Scared feeling" },

  // 17. Vehicles
  { word: "CAR", category: "Vehicles", hint: "Drive on road" },
  { word: "BIKE", category: "Vehicles", hint: "Two wheels" },
  { word: "TRUCK", category: "Vehicles", hint: "Hauls cargo" },
  { word: "SHIP", category: "Vehicles", hint: "Large boat" },
  { word: "BUS", category: "Vehicles", hint: "Public transport" },

  // 18. Drinks
  { word: "WATER", category: "Drinks", hint: "Clear liquid" },
  { word: "MILK", category: "Drinks", hint: "Dairy drink" },
  { word: "JUICE", category: "Drinks", hint: "Fruit drink" },
  { word: "TEA", category: "Drinks", hint: "Leaf drink" },
  { word: "SODA", category: "Drinks", hint: "Fizzy drink" },

  // 19. Time
  { word: "HOUR", category: "Time", hint: "60 minutes" },
  { word: "WEEK", category: "Time", hint: "7 days" },
  { word: "YEAR", category: "Time", hint: "365 days" },
  { word: "NOON", category: "Time", hint: "Midday" },
  { word: "DAY", category: "Time", hint: "Sun is up" },

  // 20. Beach
  { word: "SAND", category: "Beach", hint: "Tiny rocks" },
  { word: "WAVE", category: "Beach", hint: "Moving water" },
  { word: "SHELL", category: "Beach", hint: "Sea creature home" },
  { word: "SURF", category: "Beach", hint: "Ride the waves" }
];

export async function fetchRandomWord(): Promise<WordData> {
  // Simulate async delay for "loading" feel
  await new Promise(r => setTimeout(r, 600));
  return LOCAL_WORDS[Math.floor(Math.random() * LOCAL_WORDS.length)];
}

export async function fetchCipherTaunt(status: string, hp: number): Promise<string> {
  try {
    const response = await getAI().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are the 'Cipher Ghost', a hostile AI guarding a secure node. Generate a very short (max 10 words), creepy, cyberpunk-style taunt for a player. Status: ${status}, Player HP: ${hp}/6. Keep it professional but menacing.`,
    });
    return response.text.trim();
  } catch {
    return "SYSTEM_ERROR: COUNTER_MEASURES_ACTIVE.";
  }
}
