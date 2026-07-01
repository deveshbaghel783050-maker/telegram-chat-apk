import { Message } from "@/context/ProfileContext";

export type RandomUser = {
  name: string;
  username: string;
  phone: string;
  avatarColor: string;
};

export const RANDOM_USERS: RandomUser[] = [
  { name: "Arjun Singh",    username: "@arjun_s",      phone: "+91 98765 43210", avatarColor: "#e17055" },
  { name: "Priya Sharma",   username: "@priya_sh",     phone: "+91 87654 32109", avatarColor: "#6c5ce7" },
  { name: "Rahul Kumar",    username: "@rahul_k",      phone: "+91 76543 21098", avatarColor: "#00b894" },
  { name: "Neha Gupta",     username: "@neha_g",       phone: "+91 65432 10987", avatarColor: "#fd79a8" },
  { name: "Amit Verma",     username: "@amit_v",       phone: "+91 54321 09876", avatarColor: "#0984e3" },
  { name: "Pooja Patel",    username: "@pooja_p",      phone: "+91 43210 98765", avatarColor: "#00cec9" },
  { name: "Vikram Rao",     username: "@vikram_r",     phone: "+91 32109 87654", avatarColor: "#fdcb6e" },
  { name: "Kavita Nair",    username: "@kavita_n",     phone: "+91 21098 76543", avatarColor: "#a29bfe" },
  { name: "Ravi Mehta",     username: "@ravi_m",       phone: "+91 10987 65432", avatarColor: "#55efc4" },
  { name: "Sunita Das",     username: "@sunita_d",     phone: "+91 99887 76655", avatarColor: "#e84393" },
  { name: "Deepak Joshi",   username: "@deepak_j",     phone: "+91 88776 65544", avatarColor: "#2d3436" },
  { name: "Anjali Kapoor",  username: "@anjali_k",     phone: "+91 77665 54433", avatarColor: "#d63031" },
  { name: "Suresh Reddy",   username: "@suresh_r",     phone: "+91 66554 43322", avatarColor: "#6ab04c" },
  { name: "Meena Iyer",     username: "@meena_i",      phone: "+91 55443 32211", avatarColor: "#f9ca24" },
  { name: "Arun Pillai",    username: "@arun_p",       phone: "+91 44332 21100", avatarColor: "#e55039" },
  { name: "Divya Bose",     username: "@divya_b",      phone: "+91 33221 10099", avatarColor: "#8e44ad" },
  { name: "Manish Tiwari",  username: "@manish_t",     phone: "+91 22110 09988", avatarColor: "#2980b9" },
  { name: "Sonal Shah",     username: "@sonal_s",      phone: "+91 11009 98877", avatarColor: "#16a085" },
  { name: "Kiran Malhotra", username: "@kiran_m",      phone: "+91 90909 80808", avatarColor: "#f39c12" },
  { name: "Rohit Chaudhary",username: "@rohit_c",      phone: "+91 80808 70707", avatarColor: "#c0392b" },
  { name: "Naveen Nayak",   username: "@naveen_n",     phone: "+91 70707 60606", avatarColor: "#1abc9c" },
  { name: "Sanjay Gupta",   username: "@sanjay_g",     phone: "+91 60606 50505", avatarColor: "#e67e22" },
  { name: "Rekha Singh",    username: "@rekha_s",      phone: "+91 50505 40404", avatarColor: "#9b59b6" },
  { name: "Aditya Kumar",   username: "@aditya_k",     phone: "+91 40404 30303", avatarColor: "#3498db" },
  { name: "Geeta Rani",     username: "@geeta_r",      phone: "+91 30303 20202", avatarColor: "#e74c3c" },
];

// WIN_IMAGE marker — automationRunner replaces this with a real base64 dataUrl
export const WIN_IMAGE_MARKER = "__WIN_IMAGE__";

type ConvMessage = { sent: boolean; text: string; imageUri?: string };
type ConvTemplate = ConvMessage[];

// ─── Win-proof conversation templates ────────────────────────────────────────
// Image position intentionally varies: near bottom, middle, or after 2-3 messages.
// This makes each generated screenshot look naturally different.
const WIN_CONVERSATIONS: ConvTemplate[] = [

  // ── IMAGE NEAR BOTTOM ─────────────────────────────────────────────────────

  // 1. Long chat, proof at the very end
  [
    { sent: true,  text: "Kya chal rha hai bhai?" },
    { sent: false, text: "Bhai aaj bohot acha hua" },
    { sent: true,  text: "Sachchi? Kya hua?" },
    { sent: false, text: "Teri wali tip laga di thi kal raat" },
    { sent: true,  text: "Haha aur?" },
    { sent: false, text: "Dekh khud 👇" },
    { sent: false, text: "", imageUri: WIN_IMAGE_MARKER },
  ],

  // 2. Proof drop at the end, no reply after
  [
    { sent: false, text: "Bhai 🙏🙏" },
    { sent: true,  text: "Bol bhai kya hua" },
    { sent: false, text: "Aaj prediction 100% sahi tha" },
    { sent: true,  text: "Wahh seriously? Proof bhej" },
    { sent: false, text: "Le dekh" },
    { sent: false, text: "", imageUri: WIN_IMAGE_MARKER },
  ],

  // 3. Short banter then proof at bottom
  [
    { sent: true,  text: "Good morning bro ☀️" },
    { sent: false, text: "Good morning bhai 🙏" },
    { sent: false, text: "Subah subah achi khabar laya hun" },
    { sent: true,  text: "Bol na jaldi 😄" },
    { sent: false, text: "Raat wala laga tha, profit ho gaya" },
    { sent: false, text: "", imageUri: WIN_IMAGE_MARKER },
  ],

  // 4. User asks for proof → image at end
  [
    { sent: false, text: "Sir namaste 🙏" },
    { sent: false, text: "Aaj ka result aaya" },
    { sent: true,  text: "Kya mila? Screenshot bhej" },
    { sent: false, text: "Haan ji abhi bhejta hun" },
    { sent: false, text: "", imageUri: WIN_IMAGE_MARKER },
  ],

  // 5. Very short – image is last message
  [
    { sent: false, text: "Guru ji 🙏" },
    { sent: true,  text: "Bol bhai" },
    { sent: false, text: "Aapka call sahi tha bhai, dekho" },
    { sent: false, text: "", imageUri: WIN_IMAGE_MARKER },
  ],

  // 6. Excitement, then drop proof at bottom
  [
    { sent: false, text: "Yaar 😍😍😍" },
    { sent: true,  text: "Kya hua bata" },
    { sent: false, text: "Kal wali strategy ne kaam kiya" },
    { sent: true,  text: "Seriously?! Kitna?" },
    { sent: false, text: "Khud dekh proof" },
    { sent: false, text: "", imageUri: WIN_IMAGE_MARKER },
  ],

  // ── IMAGE IN THE MIDDLE ───────────────────────────────────────────────────

  // 7. Proof in middle, reaction after
  [
    { sent: false, text: "Hii bro 👋" },
    { sent: false, text: "Aaj ka result dekho" },
    { sent: false, text: "", imageUri: WIN_IMAGE_MARKER },
    { sent: false, text: "Mast hua na bhai 😎" },
    { sent: true,  text: "Bhai ekdum mast! 🔥 Keep it up" },
    { sent: false, text: "Thank you bhai sab aapki wajah se 🙏" },
  ],

  // 8. Proof mid, conversation continues
  [
    { sent: false, text: "Bhai good evening" },
    { sent: false, text: "Shaam ko result aaya" },
    { sent: false, text: "", imageUri: WIN_IMAGE_MARKER },
    { sent: true,  text: "Wow subah se shaam tak ekdum solid! 🌟" },
    { sent: false, text: "Haan bhai aapke signal pe trust tha" },
    { sent: true,  text: "Aise hi chalte raho 💪" },
  ],

  // 9. Proof mid, amount mentioned after
  [
    { sent: false, text: "Bro dekh" },
    { sent: false, text: "Aaj ka screenshot" },
    { sent: false, text: "", imageUri: WIN_IMAGE_MARKER },
    { sent: false, text: "2800 ka profit bhai!" },
    { sent: true,  text: "Bhai bahut shandaar! 🏆🏆" },
    { sent: false, text: "Teri wajah se yaar, shukriya" },
  ],

  // 10. Mid proof, back-and-forth after
  [
    { sent: false, text: "Bhai lucky day aaj 😁" },
    { sent: false, text: "Ye dekh" },
    { sent: false, text: "", imageUri: WIN_IMAGE_MARKER },
    { sent: true,  text: "Kya baat hai! 🎉🎉" },
    { sent: false, text: "Tera number ekdum sahi tha yaar" },
    { sent: true,  text: "Milke jeete hain bro 😄" },
    { sent: false, text: "Haha haan bhai roz aise ho 😂" },
  ],

  // 11. Greeting → proof → thank you chain
  [
    { sent: false, text: "Sir 🙏🙏" },
    { sent: false, text: "UVA ki wajah se aaj profit hua" },
    { sent: false, text: "", imageUri: WIN_IMAGE_MARKER },
    { sent: false, text: "Bahut acha laga bhai" },
    { sent: true,  text: "Bahut badhiya! Congratulations 😊" },
    { sent: false, text: "Hamesha aise hi chalte raho" },
  ],

  // 12. Proof mid, mentions winnings twice
  [
    { sent: false, text: "Jai ho bhai 🙏" },
    { sent: false, text: "Aaj teri prediction ne kamaal kiya" },
    { sent: false, text: "", imageUri: WIN_IMAGE_MARKER },
    { sent: false, text: "4000 se upar profit bhai" },
    { sent: true,  text: "Arre wah! Keep going bro 💪" },
    { sent: false, text: "Roz aise hi ho 😄" },
  ],

  // ── IMAGE AFTER JUST 1-2 MESSAGES (near top) ─────────────────────────────

  // 13. Almost immediate proof
  [
    { sent: false, text: "Bhai dekh 👇" },
    { sent: false, text: "", imageUri: WIN_IMAGE_MARKER },
    { sent: false, text: "1800 ka fayda hua aaj" },
    { sent: true,  text: "Bhai kya mast! 🎯 Ekdum solid" },
    { sent: false, text: "Tere bina possible nahi tha yaar" },
    { sent: true,  text: "Accha kiya bhai, lage raho 🔥" },
  ],

  // 14. One liner then image
  [
    { sent: false, text: "Bhai proof bhej rha hun" },
    { sent: false, text: "", imageUri: WIN_IMAGE_MARKER },
    { sent: false, text: "Rs 1500 net profit 😎" },
    { sent: true,  text: "Wahh bhai! Superb 🌟🌟" },
    { sent: false, text: "Aapka signal tha toh darr nahi tha" },
    { sent: true,  text: "Sahi kiya bhai, aise hi karo 😊" },
  ],

  // 15. Quick hello → image → detailed reaction
  [
    { sent: false, text: "Yaar aaj toh maza aa gaya 😁" },
    { sent: false, text: "", imageUri: WIN_IMAGE_MARKER },
    { sent: true,  text: "Ek dum mast bhai! 🔥" },
    { sent: false, text: "Kaafi time se wait kar rha tha iske liye" },
    { sent: true,  text: "Patience pays off bro! 👏" },
    { sent: false, text: "Haan bilkul, next bhi lagata hun" },
  ],

  // 16. Morning drop, image 2nd message
  [
    { sent: false, text: "Good morning bhai ☀️" },
    { sent: false, text: "", imageUri: WIN_IMAGE_MARKER },
    { sent: true,  text: "Wow bhai! Subah subah achi news 🌞" },
    { sent: false, text: "Haan bhai seedha profit 😎" },
    { sent: true,  text: "Shabash! Aise hi chalta rahe 💪" },
  ],

  // 17. One word + image + long chat after
  [
    { sent: false, text: "Bhai 🙏" },
    { sent: false, text: "", imageUri: WIN_IMAGE_MARKER },
    { sent: false, text: "Dekha? 3 baar jeeta aaj bhai" },
    { sent: true,  text: "Bhai bahut acha! 🎉🎉🎉" },
    { sent: false, text: "Ab roz aisa chahiye 😄" },
    { sent: true,  text: "Haha bilkul bhai, lage raho 💪" },
    { sent: false, text: "Thank you so much guruji 🙏" },
  ],

  // 18. Quick proof, minimal chat after
  [
    { sent: false, text: "Hi bro" },
    { sent: false, text: "", imageUri: WIN_IMAGE_MARKER },
    { sent: false, text: "See my profit 😊" },
    { sent: true,  text: "Welcome bro 🥰" },
  ],

  // 19. Proof second-to-last
  [
    { sent: false, text: "Bhai aaj ka khel khatam hua" },
    { sent: true,  text: "Kaisa rha? Profit ya loss?" },
    { sent: false, text: "Ekdum mast bhai" },
    { sent: false, text: "", imageUri: WIN_IMAGE_MARKER },
    { sent: true,  text: "Bahut badiya bhai! Keep it up 🔥" },
  ],

  // 20. Longer setup, proof second-to-last, last is thank you
  [
    { sent: false, text: "Bhai prediction ekdum sahi rha aaj" },
    { sent: true,  text: "Haan bhai mujhe bhi pata tha 😎" },
    { sent: false, text: "Aur bonus bhi aa gaya oopar se" },
    { sent: true,  text: "Wahh! Kitna hua total?" },
    { sent: false, text: "", imageUri: WIN_IMAGE_MARKER },
    { sent: true,  text: "Congratulations bhai! 🥳🥳" },
  ],

  // ── SENT = TRUE (image on RIGHT side — admin sharing proof) ──────────────

  // 21. Member sends proof, admin reacts
  [
    { sent: true,  text: "Bhai aaj ka result kya hua?" },
    { sent: false, text: "Dekh mera result" },
    { sent: false, text: "", imageUri: WIN_IMAGE_MARKER },
  ],

  // 22. Member shares result mid-conversation
  [
    { sent: true,  text: "Sir signal sahi tha kya aaj?" },
    { sent: false, text: "100% sahi tha bhai, dekh khud" },
    { sent: false, text: "", imageUri: WIN_IMAGE_MARKER },
    { sent: false, text: "Itna profit mila aaj" },
    { sent: true,  text: "Wahh bhai! Aap toh kamaal ho 🙏🙏" },
  ],

  // 23. Member drops proof, admin reacts
  [
    { sent: true,  text: "Bhai ye genuine hai?" },
    { sent: false, text: "Haan bilkul, dekh khud" },
    { sent: false, text: "", imageUri: WIN_IMAGE_MARKER },
    { sent: true,  text: "Bhai sach mein 🔥 Bahut badhiya!" },
  ],

  // 24. Member shares proof, conversation after
  [
    { sent: true,  text: "Sir aaj ka kya scene hai?" },
    { sent: false, text: "Aaj bhi solid rha bhai" },
    { sent: false, text: "", imageUri: WIN_IMAGE_MARKER },
    { sent: true,  text: "Ek dum mast bhai! 🔥" },
    { sent: false, text: "Roz aise hi hoga, trust karo" },
    { sent: true,  text: "Ji bhai 🙏 full trust hai" },
  ],

  // 25. Member sends proof, one reply after
  [
    { sent: true,  text: "Bhai yesterday ka result?" },
    { sent: false, text: "Ye rha proof" },
    { sent: false, text: "", imageUri: WIN_IMAGE_MARKER },
    { sent: true,  text: "Bhai wah! 🎉 Next bhi batao" },
  ],
];

// ─── Regular fallback conversations (no image) ────────────────────────────────
const REGULAR_CONVERSATIONS: ConvTemplate[] = [
  [
    { sent: true,  text: "Hey! Kya chal rha hai?" },
    { sent: false, text: "Arre bhai sab theek hai! Tu bata 😄" },
    { sent: true,  text: "Kuch nahi bas bore ho rha hun" },
    { sent: false, text: "Haha same yaar 😂" },
    { sent: true,  text: "Aaj kuch plan hai?" },
    { sent: false, text: "Nahi yaar ghar pe hi hun" },
    { sent: true,  text: "Chalte hai kuch khane? Pizza?" },
    { sent: false, text: "Ha bhai bilkul! Kab nikal?" },
    { sent: true,  text: "8 baje thik rahega?" },
    { sent: false, text: "Done! ✅ Main ready rahunga" },
  ],
  [
    { sent: true,  text: "Score kya hua match ka?" },
    { sent: false, text: "India ne jeeta bhai! 🎉" },
    { sent: true,  text: "Sacchi?! Kitne run se?" },
    { sent: false, text: "6 wicket se! Rohit ne mara" },
    { sent: true,  text: "Bumrah ka bowling kaisi rhi?" },
    { sent: false, text: "3 wicket liye usne! 🔥" },
    { sent: true,  text: "Bhai main miss kar gaya" },
    { sent: false, text: "Highlights dekh YouTube pe" },
    { sent: true,  text: "Ha abhi dekhta hun" },
    { sent: false, text: "Kya match tha yaar! 🏏" },
  ],
];

/**
 * Formats a time given total minutes-since-midnight.
 * Wraps at 24h boundary safely.
 */
function formatTime(totalMins: number): string {
  const clamped = ((totalMins % 1440) + 1440) % 1440; // keep in [0, 1440)
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  const hour = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

/**
 * Returns current time in total minutes since midnight.
 */
function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function getRandomUser(): RandomUser {
  return RANDOM_USERS[Math.floor(Math.random() * RANDOM_USERS.length)];
}

/**
 * Returns a win-proof conversation. The image message has imageUri = WIN_IMAGE_MARKER.
 * Caller must replace WIN_IMAGE_MARKER with an actual base64 dataUrl before rendering.
 * Timestamps are anchored to the current real time — last message ≈ now.
 */
export function getWinConversation(user: RandomUser): Message[] {
  const template = WIN_CONVERSATIONS[Math.floor(Math.random() * WIN_CONVERSATIONS.length)];
  const now = nowMinutes();
  // Space messages 2 min apart; anchor so last message = now
  const startMins = now - (template.length - 1) * 2;
  return template.map((t, i) => ({
    id: `win_${Date.now()}_${i}`,
    text: t.text,
    sent: t.sent,
    time: formatTime(startMins + i * 2),
    read: t.sent,
    imageUri: t.imageUri,
  }));
}

export function getRandomConversation(user: RandomUser): Message[] {
  const template = REGULAR_CONVERSATIONS[Math.floor(Math.random() * REGULAR_CONVERSATIONS.length)];
  const now = nowMinutes();
  const startMins = now - (template.length - 1) * 2;
  return template.map((t, i) => ({
    id: `auto_${Date.now()}_${i}`,
    text: t.text,
    sent: t.sent,
    time: formatTime(startMins + i * 2),
    read: t.sent,
  }));
}

export function getUniqueRandomUsers(count: number): RandomUser[] {
  const shuffled = [...RANDOM_USERS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, RANDOM_USERS.length));
}
