// Unit 1 content. Narration is Spanish as a stand-in for Kaqchikel narration
// recorded by a native speaker; Kaqchikel phrases are kept verbatim from the
// unit sheet and approximated for the Spanish TTS voice via KAQ_TTS.

export const UNIT = {
  id: 'u1',
  number: 1,
  kaq: "Q'ejelonïk",
  es: 'Saludos',
  en: 'Greetings',
};

export const CAST = {
  narrator: { name: 'Guía', short: 'G', color: 'violet', img: 'img/guia.jpg' },
  ix: { name: 'Ixlem', short: 'Ix', color: 'pink', img: 'img/ixlem.jpg' },
  aj: { name: 'Ajtij', short: 'Aj', color: 'marigold', sub: 'la maestra' },
  ba: { name: "B'alam", short: 'B', color: 'jade', img: 'img/balam.jpg' },
  slow: { name: 'Ixlem', short: 'Ix', color: 'pink', sub: 'despacio', img: 'img/ixlem.jpg' },
  v1: { name: 'Liam', short: 'L', color: 'blue' },
  v2: { name: 'Matilda', short: 'M', color: 'jade' },
  v3: { name: 'Chris', short: 'Ch', color: 'violet' },
};

// macOS `say` voices used by tools/gen-audio.mjs
export const VOICES = {
  narrator: { voice: 'Paulina', rate: 172 },
  ix: { voice: 'Samantha', rate: 158 },
  aj: { voice: 'Flo (English (US))', rate: 150 },
  ba: { voice: 'Reed (English (US))', rate: 158 },
  slow: { voice: 'Samantha', rate: 112 },
  v1: { voice: 'Eddy (English (US))', rate: 160 },
  v2: { voice: 'Kathy', rate: 160 },
  v3: { voice: 'Rocko (English (US))', rate: 160 },
};

// ElevenLabs premade voices, matched by name at generation time.
export const ELEVEN_VOICES = {
  // Stand-in for native Kaqchikel recordings, so the cheaper model.
  narrator: { name: 'Tzij Narradora', model: 'eleven_flash_v2_5', lang: 'es', library: { language: 'es', accent: 'latin american', gender: 'female' } },
  ix: { name: 'Jessica', id: 'cgSgspJ2msm6clMCkdW9' },
  aj: { name: 'Sarah', id: 'EXAVITQu4vr4xnSDxMaL' },
  ba: { name: 'Will', id: 'bIHbv24MWmeRgasZH58o' },
  slow: { name: 'Jessica', id: 'cgSgspJ2msm6clMCkdW9', speed: 0.75 },
  v1: { name: 'Liam', id: 'TX3LPaxmHKxFdv7VOQHJ' },
  v2: { name: 'Matilda', id: 'XrExE9yKIg1WjnnlVkGX' },
  v3: { name: 'Chris', id: 'iP95p4xoKVk53GoZ742B' },
};

// Longest first: applied in order to anything the Spanish voice reads.
export const KAQ_TTS = [
  ["¿La ütz awäch?", '¿La utz awách?'],
  ["¿Ütz awäch rat?", '¿Utz awách rat?'],
  ["¿Achike ab'i' rat?", '¿Achiké abí rat?'],
  ["¿Achike ab'i'?", '¿Achiké abí?'],
  ['Ütz, matyöx', 'Utz, matiósh'],
  ["Chwa'q chïk", 'Chuák chik'],
  ["Xqa q'ij", "Shká kij"],
  ["Xok aq'a'", 'Shok aká'],
  ["Q'ejelonïk", 'Kejeloník'],
  ["Nub'i'", 'Nubí'],
  ["B'alam", 'Balám'],
  ["Takuyu'", 'Takuyú'],
  ['Xsaqär', 'Shsakár'],
  ['Matyöx', 'Matiósh'],
  ['matyöx', 'matiósh'],
  ['Manäq', 'Manák'],
  ["Ja'", 'Já'],
  ['Ixlem', 'Ishlém'],
  ['ajtij', 'ajtíj'],
  ['Ajtij', 'Ajtíj'],
  ['kaqchikel', 'kakchikél'],
];

export const EN_TTS = [
  ["B'alam", 'Bah-lahm'],
  ['Ixlem', 'Eesh-lem'],
];

const D = ['¿Cómo se dice «{kaq}»?', 'Di «{kaq}» en inglés.', '¿Y «{kaq}»?'];

export const ITEMS = {
  good_morning: {
    kaq: 'Xsaqär', es: 'Buenos días', en: 'Good morning.', say: 'gud MÓR-ning',
    buildup: ['morning', 'good morning'],
    cues: ['Es de mañana. Saluda.'],
  },
  how_are_you: {
    kaq: '¿La ütz awäch?', es: '¿Cómo estás?', en: 'How are you?', say: 'JÁU ar iú',
    buildup: ['you', 'are you', 'how are you?'],
    cues: ['Pregunta cómo está.'],
  },
  fine_thanks: {
    kaq: 'Ütz, matyöx', es: 'Bien, gracias', en: 'Fine, thank you.', say: 'FÁIN, ZÉNK-iu',
    buildup: ['thank you', 'fine', 'fine, thank you'],
    cues: ['Responde «{kaq}».'],
  },
  and_you: {
    kaq: '¿Ütz awäch rat?', es: '¿Y tú?', en: 'And you?', say: 'and IÚ',
    buildup: ['you', 'and you?'],
    cues: ['Pregunta «{kaq}»'],
  },
  thank_you: {
    kaq: 'Matyöx', es: 'Gracias', en: 'Thank you.', say: 'ZÉNK-iu',
    buildup: ['thank', 'thank you'],
    cues: ['Da las gracias.'],
  },
  good_afternoon: {
    kaq: "Xqa q'ij", es: 'Buenas tardes', en: 'Good afternoon.', say: 'gud af-ter-NÚUN',
    buildup: ['noon', 'afternoon', 'good afternoon'],
    cues: ['Es de tarde. Saluda.'],
  },
  good_evening: {
    kaq: "Xok aq'a'", es: 'Buenas noches', en: 'Good evening.', say: 'gud ÍV-ning',
    buildup: ['evening', 'good evening'],
    cues: ['Es de noche. Saluda.'],
  },
  excuse_me: {
    kaq: "Takuyu'", es: 'Disculpe', en: 'Excuse me.', say: 'ex-KIÚS mi',
    buildup: ['me', 'excuse me'],
    cues: ['Llama a la maestra con respeto.'],
  },
  yes: {
    kaq: "Ja'", es: 'Sí', en: 'Yes.', say: 'IÉS',
    buildup: ['yes'],
    cues: [],
  },
  no: {
    kaq: 'Manäq', es: 'No', en: 'No.', say: 'NÓU',
    buildup: ['no'],
    cues: [],
  },
  whats_your_name: {
    kaq: "¿Achike ab'i'?", es: '¿Cómo te llamas?', en: "What's your name?", say: 'uáts ior NÉIM',
    buildup: ['name', 'your name', "what's your name?"],
    cues: ['Pregunta su nombre.'],
  },
  my_name_is: {
    kaq: "Nub'i' B'alam", es: "Me llamo B'alam", en: "My name is B'alam.", say: 'mái NÉIM is',
    buildup: ['name is', 'my name is', "my name is B'alam"],
    cues: ['Eres B\'alam. Preséntate.'],
  },
  see_you: {
    kaq: "Chwa'q chïk", es: 'Hasta mañana', en: 'See you tomorrow!', say: 'SÍ iu tu-MÓ-rou',
    buildup: ['tomorrow', 'see you tomorrow'],
    cues: ['Despídete hasta mañana.'],
  },
};

for (const [id, it] of Object.entries(ITEMS)) {
  it.id = id;
  it.cues = [D[0], ...it.cues, D[1], D[2]];
}

const DIALOGUE = [
  ['ix', 'Good morning, teacher.'],
  ['aj', 'Good morning, Ixlem. How are you?'],
  ['ix', 'Fine, thank you. And you?'],
  ['aj', "Fine, thanks. What's your name?"],
  ['ba', "My name is B'alam."],
  ['ix', 'Thank you! See you tomorrow!'],
  ['ba', 'See you tomorrow!'],
];

export const LESSONS = {
  l1: {
    id: 'l1',
    title: 'Xsaqär',
    subtitle: 'Saludar',
    items: ['good_morning', 'how_are_you', 'fine_thanks', 'and_you', 'thank_you', 'good_afternoon', 'good_evening'],
    steps: [
      { mark: 'Bienvenida' },
      { n: '¡Xsaqär! Esta es tu primera lección de inglés.' },
      { n: 'Aquí solo escuchas y hablas.' },
      { n: 'Escucha a Ixlem, su maestra y B\'alam.' },
      { dialogue: DIALOGUE },
      { n: 'Pronto vas a decir todo eso.' },
      { n: 'Este sonido es tu turno:' },
      { chime: true },
      { n: 'Habla en voz alta, aunque te equivoques.' },

      { mark: 'Saludar' },
      { introduce: 'good_morning', pre: '«Xsaqär» en inglés:' },
      { n: '«Ajtij» es «teacher».' },
      { echo: ['slow', 'teacher'] },
      { echo: ['ix', 'Good morning, teacher.'] },
      { introduce: 'how_are_you', pre: '«¿La ütz awäch?» en inglés:' },

      { mark: 'Responder' },
      { introduce: 'fine_thanks', pre: '«Ütz, matyöx» en inglés:',
        tip: 'En «thank», la lengua va entre los dientes.',
        tipEcho: 'thank' },
      { introduce: 'and_you', pre: '«¿Ütz awäch rat?» en inglés:' },
      { n: 'Junta las dos:' },
      { echo: ['ix', 'Fine, thank you. And you?'] },
      { introduce: 'thank_you', pre: '«Matyöx» en inglés:',
        tip: 'Entre amigos: «thanks».', tipEcho: 'thanks' },

      { mark: 'Tarde y noche' },
      { introduce: 'good_afternoon', pre: '«Xqa q\'ij» en inglés:' },
      { introduce: 'good_evening', pre: '«Xok aq\'a\'» en inglés:',
        tip: '«Good night» es para despedirse de noche.', tipEcho: 'good night' },

      { mark: 'Repaso' },
      { n: 'Repaso. Responde rápido.' },
      { review: 'lesson' },

      { mark: 'Tu conversación', quiet: true },
      { n: 'Tú eres Ixlem. Responde a la maestra.' },
      { converse: ['aj', 'Good morning.'], answer: ['ix', 'Good morning, teacher.'], items: ['good_morning'] },
      { converse: ['aj', 'How are you?'], answer: ['ix', 'Fine, thank you. And you?'], items: ['fine_thanks', 'and_you'], reply: ['aj', 'Fine, thanks.'] },
      { n: 'Es de tarde. Llega B\'alam.' },
      { converse: ['ba', 'Good afternoon.'], answer: ['ix', 'Good afternoon.'], items: ['good_afternoon'] },
      { n: 'Pregúntale cómo está.' },
      { prompt: 'how_are_you', answer: ['ix', 'How are you?'], reply: ['ba', 'Fine, thank you. And you?'] },
      { converse: null, lead: 'Respóndele.', answer: ['ix', 'Fine, thanks.'], items: ['fine_thanks'] },
      { n: '¡Tu primera conversación en inglés!' },
      { n: 'Mañana repasamos. ¡Matyöx! ¡Chwa\'q chïk!' },
    ],
  },

  l2: {
    id: 'l2',
    title: "¿Achike ab'i'?",
    subtitle: 'Presentarte y despedirte',
    items: ['excuse_me', 'yes', 'no', 'whats_your_name', 'my_name_is', 'see_you'],
    steps: [
      { mark: 'Calentamiento' },
      { n: '¡Xsaqär! Primero, lo de ayer.' },
      { review: ['good_morning', 'how_are_you', 'fine_thanks', 'and_you', 'good_evening'], warm: true },
      { n: 'Escucha otra vez a Ixlem.' },
      { dialogue: DIALOGUE },

      { mark: 'Con respeto' },
      { introduce: 'excuse_me', pre: '«Takuyu\'» en inglés:' },
      { introduce: 'yes', pre: '«Ja\'» en inglés:' },
      { introduce: 'no', pre: '«Manäq» en inglés:' },

      { mark: 'Presentarse' },
      { introduce: 'whats_your_name', pre: '«¿Achike ab\'i\'?» en inglés:',
        tip: 'El final de «what\'s» es la «tz» de «tzij».',
        tipEcho: "what's" },
      { introduce: 'my_name_is', pre: '«Nub\'i\' B\'alam» en inglés:' },
      { n: 'Ahora con tu nombre.' },
      { free: 'Di: My name is… + tu nombre' },
      { n: 'Otra vez, más fuerte.' },
      { free: 'My name is… + tu nombre' },

      { mark: 'Despedirse' },
      { introduce: 'see_you', pre: '«Chwa\'q chïk» en inglés:',
        tip: 'También: «goodbye».', tipEcho: 'goodbye' },

      { mark: 'Repaso' },
      { n: 'Repaso.' },
      { review: 'lesson' },

      { mark: 'Tu conversación', quiet: true },
      { n: 'Tú eres Ixlem. Llega la maestra.' },
      { converse: ['aj', 'Good morning, Ixlem. How are you?'], answer: ['ix', 'Fine, thank you. And you?'], items: ['fine_thanks', 'and_you'] },
      { converse: ['aj', "Fine, thanks. What's your name?"], lead: null, answer: ['ba', "My name is B'alam."], items: ['my_name_is'], label: "Tú eres B'alam" },
      { n: 'Pregúntale su nombre a un compañero.' },
      { prompt: 'whats_your_name', answer: ['ix', "What's your name?"], reply: ['ba', "My name is B'alam."] },
      { n: 'Fin de clase. Da las gracias y despídete.' },
      { prompt: null, answer: ['ix', 'Thank you! See you tomorrow!'], items: ['thank_you', 'see_you'], reply: ['aj', 'See you tomorrow!'] },
      { n: 'Ya saludas, te presentas y te despides. ¡Matyöx! ¡Chwa\'q chïk!' },
    ],
  },

  review: {
    id: 'review',
    title: 'Repaso rápido',
    subtitle: 'Toda la unidad',
    items: Object.keys(ITEMS),
    steps: [
      { mark: 'Repaso' },
      { n: '¡Xsaqär! Repaso rápido.' },
      { review: 'all', warm: true },
      { n: '¡Matyöx!' },
    ],
  },
};
