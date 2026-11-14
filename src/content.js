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
};

// macOS `say` voices used by tools/gen-audio.mjs
export const VOICES = {
  narrator: { voice: 'Paulina', rate: 172 },
  ix: { voice: 'Samantha', rate: 158 },
  aj: { voice: 'Flo (English (US))', rate: 150 },
  ba: { voice: 'Reed (English (US))', rate: 158 },
  slow: { voice: 'Samantha', rate: 112 },
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
    cues: ['Son las siete de la mañana. Saluda.'],
  },
  how_are_you: {
    kaq: '¿La ütz awäch?', es: '¿Cómo estás?', en: 'How are you?', say: 'JÁU ar iú',
    buildup: ['you', 'are you', 'how are you?'],
    cues: ['Pregúntale a alguien cómo está.'],
  },
  fine_thanks: {
    kaq: 'Ütz, matyöx', es: 'Bien, gracias', en: 'Fine, thank you.', say: 'FÁIN, ZÉNK-iu',
    buildup: ['thank you', 'fine', 'fine, thank you'],
    cues: ['Te preguntan cómo estás. Responde: «{kaq}».'],
  },
  and_you: {
    kaq: '¿Ütz awäch rat?', es: '¿Y tú?', en: 'And you?', say: 'and IÚ',
    buildup: ['you', 'and you?'],
    cues: ['Devuélvele la pregunta: «{kaq}»'],
  },
  thank_you: {
    kaq: 'Matyöx', es: 'Gracias', en: 'Thank you.', say: 'ZÉNK-iu',
    buildup: ['thank', 'thank you'],
    cues: ['Alguien te ayudó. Dale las gracias.'],
  },
  good_afternoon: {
    kaq: "Xqa q'ij", es: 'Buenas tardes', en: 'Good afternoon.', say: 'gud af-ter-NÚUN',
    buildup: ['noon', 'afternoon', 'good afternoon'],
    cues: ['Son las tres de la tarde. Saluda.'],
  },
  good_evening: {
    kaq: "Xok aq'a'", es: 'Buenas noches', en: 'Good evening.', say: 'gud ÍV-ning',
    buildup: ['evening', 'good evening'],
    cues: ['Ya es de noche y llegas a una casa. Saluda.'],
  },
  excuse_me: {
    kaq: "Takuyu'", es: 'Disculpe', en: 'Excuse me.', say: 'ex-KIÚS mi',
    buildup: ['me', 'excuse me'],
    cues: ['Quieres hablarle a la maestra con respeto. ¿Qué dices primero?'],
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
    cues: ['Quieres saber cómo se llama alguien. Pregúntale.'],
  },
  my_name_is: {
    kaq: "Nub'i' B'alam", es: "Me llamo B'alam", en: "My name is B'alam.", say: 'mái NÉIM is',
    buildup: ['name is', 'my name is', "my name is B'alam"],
    cues: ['Eres B\'alam. Di cómo te llamas.'],
  },
  see_you: {
    kaq: "Chwa'q chïk", es: 'Hasta mañana', en: 'See you tomorrow!', say: 'SÍ iu tu-MÓ-rou',
    buildup: ['tomorrow', 'see you tomorrow'],
    cues: ['Se acabaron las clases. Despídete hasta mañana.'],
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
    subtitle: 'Saludar y preguntar «¿cómo estás?»',
    items: ['good_morning', 'how_are_you', 'fine_thanks', 'and_you', 'thank_you', 'good_afternoon', 'good_evening'],
    steps: [
      { mark: 'Bienvenida' },
      { n: '¡Xsaqär! Esta es tu primera lección de inglés.' },
      { n: 'Aquí no vas a leer ni a escribir. Vas a escuchar, y vas a hablar en voz alta.' },
      { n: 'Escucha a Ixlem, a su maestra y a B\'alam. Hablan en inglés. No tienes que entender todo.' },
      { dialogue: DIALOGUE },
      { n: '¿Entendiste algo? No importa. Muy pronto vas a poder decir todo eso.' },
      { n: 'Cuando escuches este sonido, es tu turno:' },
      { chime: true },
      { n: 'Habla en voz alta, aunque no estés seguro. Equivocarse también es aprender.' },

      { mark: 'Saludar' },
      { introduce: 'good_morning', pre: 'En inglés, «Xsaqär» se dice así:' },
      { n: 'Ixlem saluda a su maestra. «Maestra», o «ajtij», en inglés es «teacher».' },
      { echo: ['slow', 'teacher'] },
      { echo: ['ix', 'Good morning, teacher.'] },
      { introduce: 'how_are_you', pre: 'La maestra le pregunta «¿La ütz awäch?». En inglés:' },

      { mark: 'Responder' },
      { introduce: 'fine_thanks', pre: 'Ixlem responde «Ütz, matyöx». En inglés:',
        tip: 'Fíjate en «thank». Pon la punta de la lengua entre los dientes y sopla suave. Ese sonido no existe en kaqchikel ni en español.',
        tipEcho: 'thank' },
      { introduce: 'and_you', pre: 'Y luego pregunta «¿Ütz awäch rat?». En inglés:' },
      { n: 'Ahora junta las dos partes, como Ixlem.' },
      { echo: ['ix', 'Fine, thank you. And you?'] },
      { introduce: 'thank_you', pre: 'Solo «Matyöx» se dice:',
        tip: 'Entre amigos también se dice más corto: «thanks».', tipEcho: 'thanks' },

      { mark: 'Tarde y noche' },
      { introduce: 'good_afternoon', pre: 'Después del mediodía, «Xqa q\'ij» se dice:' },
      { introduce: 'good_evening', pre: 'Y cuando ya oscureció, «Xok aq\'a\'» se dice:',
        tip: 'Ojo: «good night» es solo para despedirse en la noche, o antes de dormir.', tipEcho: 'good night' },

      { mark: 'Repaso' },
      { n: 'Vamos a repasar todo. Responde lo más rápido que puedas.' },
      { review: 'lesson' },

      { mark: 'Tu conversación', quiet: true },
      { n: 'Ahora tú eres Ixlem. La maestra te saluda. Respóndele.' },
      { converse: ['aj', 'Good morning.'], answer: ['ix', 'Good morning, teacher.'], items: ['good_morning'] },
      { converse: ['aj', 'How are you?'], answer: ['ix', 'Fine, thank you. And you?'], items: ['fine_thanks', 'and_you'], reply: ['aj', 'Fine, thanks.'] },
      { n: 'Ahora es de tarde. B\'alam llega a la escuela.' },
      { converse: ['ba', 'Good afternoon.'], answer: ['ix', 'Good afternoon.'], items: ['good_afternoon'] },
      { n: 'Pregúntale cómo está.' },
      { prompt: 'how_are_you', answer: ['ix', 'How are you?'], reply: ['ba', 'Fine, thank you. And you?'] },
      { converse: null, lead: 'Respóndele.', answer: ['ix', 'Fine, thanks.'], items: ['fine_thanks'] },
      { n: '¡Lo lograste! Acabas de tener tu primera conversación en inglés.' },
      { n: 'Mañana vamos a repasar esto antes de aprender algo nuevo. Repasar al día siguiente hace que no se te olvide. ¡Matyöx! ¡Chwa\'q chïk!' },
    ],
  },

  l2: {
    id: 'l2',
    title: "¿Achike ab'i'?",
    subtitle: 'Presentarte y despedirte',
    items: ['excuse_me', 'yes', 'no', 'whats_your_name', 'my_name_is', 'see_you'],
    steps: [
      { mark: 'Calentamiento' },
      { n: '¡Xsaqär! Antes de empezar, vamos a ver qué recuerdas de ayer.' },
      { review: ['good_morning', 'how_are_you', 'fine_thanks', 'and_you', 'good_evening'], warm: true },
      { n: 'Muy bien. Escucha otra vez la conversación de Ixlem.' },
      { dialogue: DIALOGUE },

      { mark: 'Con respeto' },
      { introduce: 'excuse_me', pre: 'Para hablarle a alguien con respeto, «Takuyu\'» se dice:' },
      { introduce: 'yes', pre: '«Ja\'» se dice:' },
      { introduce: 'no', pre: 'Y «Manäq» se dice:' },
      { n: 'Fácil, ¿verdad? Muchas palabras en inglés son cortas.' },

      { mark: 'Presentarse' },
      { introduce: 'whats_your_name', pre: 'La maestra le pregunta a B\'alam «¿Achike ab\'i\'?». En inglés:',
        tip: 'Escucha el final de «what\'s». Suena como la «tz» del kaqchikel, como en «tzij». ¡Ese sonido ya lo sabes hacer!',
        tipEcho: "what's" },
      { introduce: 'my_name_is', pre: 'B\'alam responde «Nub\'i\' B\'alam». En inglés:' },
      { n: 'Ahora di tu propio nombre. «My name is», y tu nombre.' },
      { free: 'Di: My name is… + tu nombre' },
      { n: 'Otra vez, más fuerte.' },
      { free: 'My name is… + tu nombre' },

      { mark: 'Despedirse' },
      { introduce: 'see_you', pre: 'Para despedirte, «Chwa\'q chïk» se dice:',
        tip: 'Si no vas a ver a la persona mañana, puedes decir solo «goodbye».', tipEcho: 'goodbye' },

      { mark: 'Repaso' },
      { n: 'Repasemos todo lo de hoy.' },
      { review: 'lesson' },

      { mark: 'Tu conversación', quiet: true },
      { n: 'Ahora tú eres Ixlem, en la escuela. Llega la maestra.' },
      { converse: ['aj', 'Good morning, Ixlem. How are you?'], answer: ['ix', 'Fine, thank you. And you?'], items: ['fine_thanks', 'and_you'] },
      { converse: ['aj', "Fine, thanks. What's your name?"], lead: null, answer: ['ba', "My name is B'alam."], items: ['my_name_is'], label: "Tú eres B'alam" },
      { n: 'Ahora tú le preguntas su nombre a un compañero nuevo.' },
      { prompt: 'whats_your_name', answer: ['ix', "What's your name?"], reply: ['ba', "My name is B'alam."] },
      { n: 'Se acabó la clase. Dale las gracias a la maestra y despídete.' },
      { prompt: null, answer: ['ix', 'Thank you! See you tomorrow!'], items: ['thank_you', 'see_you'], reply: ['aj', 'See you tomorrow!'] },
      { n: '¡Excelente! Ya puedes saludar, presentarte y despedirte en inglés. ¡Matyöx! ¡Chwa\'q chïk!' },
    ],
  },

  review: {
    id: 'review',
    title: 'Repaso rápido',
    subtitle: 'Toda la unidad, sin pensarlo mucho',
    items: Object.keys(ITEMS),
    steps: [
      { mark: 'Repaso' },
      { n: '¡Xsaqär! Repaso rápido de la unidad uno. Responde en voz alta, sin pensarlo mucho.' },
      { review: 'all', warm: true },
      { n: '¡Matyöx! Mañana, otro repaso.' },
    ],
  },
};
