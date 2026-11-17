import type { KnowledgeCard, KnowledgeCategory } from './types';

export const knowledgeCategories: KnowledgeCategory[] = [
  {
    id: 'observations',
    label: 'Understanding your observations',
    shortLabel: 'Observations',
    description: 'Baselines, percentages, review flags, timestamps and missing values.',
  },
  {
    id: 'measurement',
    label: 'Health measurement basics',
    shortLabel: 'Measurements',
    description: 'What common health measurements represent and what they do not tell you.',
  },
  {
    id: 'astra-care',
    label: 'Using ASTRA CARE',
    shortLabel: 'Using ASTRA CARE',
    description: 'How check-ins, assessment, replay, symptoms and offline reports work.',
  },
  {
    id: 'spaceflight',
    label: 'Spaceflight context',
    shortLabel: 'Spaceflight',
    description: 'Why crews monitor health and how distance from Earth changes communication.',
  },
];

const REVIEWED = '2026-11-17';
const VERSION = '1.0.0';

export const knowledgeCards: KnowledgeCard[] = [
  {
    id: 'personal-baseline',
    title: 'What is a personal baseline?',
    category: 'observations',
    summary: 'A personal baseline is a reference value used to compare later observations.',
    plainLanguageBody:
      'A baseline gives each new reading a reference point, so you can see whether a value is higher, lower or about the same as usual. In ASTRA CARE the baseline is a fixed fictional set of values for this demo crew. It is a comparison anchor, not a target and not a definition of a healthy range.',
    example:
      'If the fictional baseline heart rate is 72 bpm and today’s reading is 81 bpm, the difference is 9 bpm above the baseline.',
    extendedExplanation:
      'A real personal baseline is usually built from repeated measurements over time and can shift with circumstances. This prototype uses one synthetic fixture baseline so the comparison stays transparent and repeatable. Being above or below it does not by itself establish a health problem. The numeric comparison is shown so you can inspect how it was produced.',
    relatedMetricTypes: ['heartRate', 'bloodPressure', 'temperature', 'sleep'],
    relatedAppFeatures: ['mission-overview', 'assessment', 'trends'],
    keywords: ['baseline', 'reference', 'comparison', 'personal', 'usual', 'synthetic baseline'],
    references: ['S06', 'S15', 'S16'],
    version: VERSION,
    lastReviewedAt: REVIEWED,
    contentClassification: 'App explanation',
    diagram: 'baseline',
    featured: true,
  },
  {
    id: 'percentage-difference',
    title: 'What does a percentage difference mean?',
    category: 'observations',
    summary: 'A percentage difference expresses the size of a change relative to the baseline value.',
    plainLanguageBody:
      'ASTRA CARE subtracts the fictional baseline from the recorded value, divides by the baseline, then multiplies by 100. The same absolute change can look larger or smaller as a percentage depending on the starting value, which is why the app shows both the absolute and percentage change.',
    example: '81 − 72 = 9 bpm. Then 9 ÷ 72 × 100 = 12.5%, so the reading is 12.5% above the fictional baseline.',
    extendedExplanation:
      'A percentage is a comparison tool, not a severity scale. A large percentage on a small baseline can still be a small absolute change. A zero or missing baseline cannot produce a percentage. The 10% review rule is a demonstration rule chosen for this prototype; it is not a clinical threshold. Mood and stress have no baseline comparison.',
    relatedMetricTypes: ['heartRate', 'bloodPressure', 'temperature', 'sleep'],
    relatedAppFeatures: ['assessment', 'trends'],
    keywords: ['percentage', 'percent', 'difference', 'calculation', 'math', 'change', '10%'],
    references: [],
    version: VERSION,
    lastReviewedAt: REVIEWED,
    contentClassification: 'App explanation',
    diagram: 'percentage',
    featured: false,
  },
  {
    id: 'flagged-for-review',
    title: 'Why might a reading be flagged for review?',
    category: 'observations',
    summary: 'A reading is flagged when its percentage difference from the fictional baseline reaches the demo rule.',
    plainLanguageBody:
      'The current demonstration rule marks an observation for review when the absolute percentage difference is at least 10%. The flag is a prompt to look at the record and its context. It is not a diagnosis, an urgency decision or a statement that something is wrong.',
    example:
      'A heart rate of 81 bpm against a fictional baseline of 72 bpm is 12.5% higher, so it meets the demo rule and appears in the review count.',
    extendedExplanation:
      'The same rule is applied to heart rate, systolic and diastolic pressure, temperature and sleep. A flag does not create, queue or send a report. If a recorded observation concerns you, follow the mission’s approved medical procedures and contact the designated support team. ASTRA CARE does not decide what a flag means for your fitness or duties.',
    relatedMetricTypes: ['heartRate', 'bloodPressure', 'temperature', 'sleep'],
    relatedAppFeatures: ['assessment', 'trends'],
    keywords: ['review', 'flag', 'flagged', 'threshold', '10%', 'deviation', 'range'],
    references: ['S15'],
    version: VERSION,
    lastReviewedAt: REVIEWED,
    contentClassification: 'App explanation',
    diagram: null,
    featured: true,
  },
  {
    id: 'timestamps',
    title: 'Why do timestamps matter?',
    category: 'observations',
    summary: 'A timestamp records when a value was saved, so older and newer observations are not confused.',
    plainLanguageBody:
      'ASTRA CARE stores the time a check-in is saved and displays it in UTC. UTC gives one shared clock, which avoids confusion between a crew member’s local time and a control center in another time zone.',
    example:
      'A reading saved at 08:00 UTC on one day can be compared with one saved at 08:00 UTC the next day without converting time zones.',
    extendedExplanation:
      'The timestamp is assigned when the record is saved, not when the form was opened, so it reflects when the data was stored. Replay uses timestamps to order observations and to limit each frame to records available at that moment. A time label says when a value was recorded; it does not prove the measurement itself was accurate.',
    relatedMetricTypes: ['timestamps'],
    relatedAppFeatures: ['check-in', 'trends', 'replay'],
    keywords: ['timestamp', 'time', 'utc', 'clock', 'timezone', 'recorded', 'when'],
    references: ['S23', 'S24'],
    version: VERSION,
    lastReviewedAt: REVIEWED,
    contentClassification: 'App explanation',
    diagram: 'timeline',
    featured: false,
  },
  {
    id: 'missing-data',
    title: 'What does missing data mean?',
    category: 'observations',
    summary: 'Missing data means a value was not recorded. It is not the same as zero.',
    plainLanguageBody:
      'Not every check-in includes every measurement. ASTRA CARE keeps missing values empty and shows “Not recorded” rather than inserting a substitute, so a gap cannot be mistaken for a real reading.',
    example: 'If sleep was not entered, the sleep card shows “Not recorded” and no sleep comparison is calculated.',
    extendedExplanation:
      'Gaps can be intentional or accidental. A comparison is calculated only when both the recorded value and the baseline exist. The app does not fill gaps with averages, previous readings or guesses. In charts, missing readings appear as gaps so the shape of a line does not imply data that was never recorded. An unanswered symptom question is also kept distinct from an explicit “no symptoms” answer.',
    relatedMetricTypes: ['timestamps'],
    relatedAppFeatures: ['check-in', 'trends', 'replay'],
    keywords: ['missing', 'empty', 'not recorded', 'gap', 'unanswered', 'data'],
    references: ['S06'],
    version: VERSION,
    lastReviewedAt: REVIEWED,
    contentClassification: 'App explanation',
    diagram: 'timeline',
    featured: false,
  },
  {
    id: 'heart-rate',
    title: 'Understanding heart-rate measurements',
    category: 'measurement',
    summary: 'Heart rate is the number of heartbeats in a minute, usually recorded in beats per minute.',
    plainLanguageBody:
      'Heart rate responds to activity, rest, stress and sleep, so a single reading is best understood alongside when and how it was taken. A manual entry reflects the number you recorded, not a continuous monitor.',
    example:
      'A resting reading of 68 bpm and a reading of 94 bpm after exercise may both be expected for the same person at different moments.',
    extendedExplanation:
      'ASTRA CARE compares an entered value with a fictional baseline and shows the arithmetic. It does not measure your pulse, detect an arrhythmia or decide whether a value is safe. Spaceflight research studies how the cardiovascular system adapts to microgravity, but that research does not turn one app reading into a diagnosis.',
    relatedMetricTypes: ['heartRate'],
    relatedAppFeatures: ['check-in', 'trends', 'assessment'],
    keywords: ['heart rate', 'pulse', 'bpm', 'beats', 'cardiac', 'cardiovascular'],
    references: ['S15', 'S16', 'S05'],
    version: VERSION,
    lastReviewedAt: REVIEWED,
    contentClassification: 'General health education',
    diagram: null,
    featured: false,
  },
  {
    id: 'blood-pressure',
    title: 'Understanding blood-pressure readings',
    category: 'measurement',
    summary: 'Blood pressure describes the pressure in your arteries when your heart beats and between beats.',
    plainLanguageBody:
      'It is written as two numbers. The first, systolic, reflects pressure during a heartbeat; the second, diastolic, reflects pressure between beats. Both are recorded in millimetres of mercury (mmHg), and both can change with posture, activity, stress and how the measurement was taken.',
    example: 'A record of 118/76 mmHg means a systolic value of 118 and a diastolic value of 76.',
    extendedExplanation:
      'A single reading is not enough to classify a person, and ASTRA CARE does not apply a clinical blood-pressure category. It compares the entered values with a fictional baseline and displays the differences. Public-health guidance explains blood pressure in more depth, but it does not replace an assessment by a qualified clinician. If a reading concerns you, follow the mission’s approved procedures.',
    relatedMetricTypes: ['bloodPressure'],
    relatedAppFeatures: ['check-in', 'trends', 'assessment'],
    keywords: ['blood pressure', 'systolic', 'diastolic', 'mmhg', 'artery', 'pressure'],
    references: ['S15', 'S16', 'S17'],
    version: VERSION,
    lastReviewedAt: REVIEWED,
    contentClassification: 'General health education',
    diagram: null,
    featured: false,
  },
  {
    id: 'body-temperature',
    title: 'Understanding body temperature',
    category: 'measurement',
    summary: 'Body temperature is a measure of how warm the body is, usually recorded in degrees Celsius.',
    plainLanguageBody:
      'The body regulates temperature within a narrow working range. The recorded value depends partly on where and how it was measured, so recording the method and time helps keep the number meaningful.',
    example:
      'A temperature of 36.6 °C and one of 37.0 °C are different recordings; the app shows both against the same fictional baseline without labelling either as an illness.',
    extendedExplanation:
      'ASTRA CARE does not assume a measurement site or convert between sites. It compares the entered value with a fictional baseline and shows the difference. Space agencies continue to study practical, validated ways to monitor core temperature in spaceflight. No single app reading establishes a fever or a diagnosis.',
    relatedMetricTypes: ['temperature'],
    relatedAppFeatures: ['check-in', 'trends', 'assessment'],
    keywords: ['temperature', 'body temperature', 'celsius', 'fever', 'warm', 'thermoregulation'],
    references: ['S15', 'S16', 'S07'],
    version: VERSION,
    lastReviewedAt: REVIEWED,
    contentClassification: 'General health education',
    diagram: null,
    featured: false,
  },
  {
    id: 'sleep-duration',
    title: 'Understanding sleep-duration records',
    category: 'measurement',
    summary: 'Sleep duration is the amount of time spent sleeping, usually recorded in hours.',
    plainLanguageBody:
      'Sleep is recorded because rest can affect attention, mood and performance. In this prototype it is self-reported, so it reflects the crew member’s own estimate rather than a sensor measurement.',
    example:
      'A crew member who reports 6.0 hours against a fictional baseline of 8.0 hours has a difference of −2.0 hours, or −25%.',
    extendedExplanation:
      'Public-health guidance for adults commonly refers to at least 7 hours per night. That is general population education, not a mission-specific target or an individual prescription. NASA also studies sleep loss, circadian desynchronization and work overload as performance risks. ASTRA CARE does not assess sleep quality or diagnose a sleep disorder.',
    relatedMetricTypes: ['sleep'],
    relatedAppFeatures: ['check-in', 'trends', 'assessment'],
    keywords: ['sleep', 'rest', 'hours', 'duration', 'fatigue', 'circadian'],
    references: ['S18', 'S19', 'S21'],
    version: VERSION,
    lastReviewedAt: REVIEWED,
    contentClassification: 'General health education',
    diagram: null,
    featured: false,
  },
  {
    id: 'mood-and-stress',
    title: 'Understanding self-reported mood and stress',
    category: 'measurement',
    summary: 'Mood and stress are self-reported ratings of how you feel, not measured physical values.',
    plainLanguageBody:
      'ASTRA CARE records mood and stress on 1–5 scales chosen by the crew member. They are subjective by design and are never compared with a baseline or flagged by the automatic percentage rule.',
    example:
      'Choosing “Okay” for mood and 3 for stress records how the moment felt; another crew member might choose differently in the same situation.',
    extendedExplanation:
      'Self-reports are useful because some experiences cannot be captured by a device. They can also be influenced by wording, privacy and expectations. NASA’s behavioral health research treats mood and performance as important parts of crew health, but this app does not screen for a condition. The ratings stay in the local record unless the crew member confirms a report.',
    relatedMetricTypes: ['mood', 'stress'],
    relatedAppFeatures: ['check-in', 'guided-check-in'],
    keywords: ['mood', 'stress', 'self-reported', 'feeling', 'wellbeing', 'behavioral'],
    references: ['S04', 'S20'],
    version: VERSION,
    lastReviewedAt: REVIEWED,
    contentClassification: 'General health education',
    diagram: null,
    featured: false,
  },
  {
    id: 'daily-check-ins',
    title: 'How daily check-ins work',
    category: 'astra-care',
    summary: 'A daily check-in is a short, manually entered record of how you are doing.',
    plainLanguageBody:
      'ASTRA CARE offers a guided check-in and a detailed form. Both record heart rate, blood pressure, temperature, sleep, mood, stress, symptoms and an optional activity note. Saving stores the record on this device.',
    example:
      'A crew member can complete the guided flow in a few steps, or open the detailed form to enter values field by field.',
    extendedExplanation:
      'Saving a check-in does not create or send a report. It updates the local record, which the overview, trends, assessment and replay read. A check-in with only some fields completed is valid as long as at least one reading is present. Missing values stay missing and are not replaced.',
    relatedMetricTypes: [],
    relatedAppFeatures: ['check-in', 'guided-check-in', 'mission-overview'],
    keywords: ['check-in', 'daily', 'record', 'save', 'observation', 'form'],
    references: [],
    version: VERSION,
    lastReviewedAt: REVIEWED,
    contentClassification: 'App explanation',
    diagram: null,
    featured: false,
  },
  {
    id: 'guided-vs-detailed',
    title: 'Guided vs. detailed check-in',
    category: 'astra-care',
    summary: 'The guided check-in walks through questions step by step; the detailed form shows all fields at once.',
    plainLanguageBody:
      'Both routes use the same validation and save path, so the stored record has the same shape whichever you choose. The guided flow is designed for speed and plain language; the detailed form is designed for direct entry and editing.',
    example:
      'Mood, stress and sleep entered in the guided flow appear in the detailed form’s fields if you switch before saving.',
    extendedExplanation:
      'Switching flows hands over the values already entered. Neither flow saves until you press Save, so switching does not create a duplicate record. The guided flow’s step gating is a presentation rule; the save pipeline still accepts a partial record under the same validation rules as the detailed form.',
    relatedMetricTypes: [],
    relatedAppFeatures: ['check-in', 'guided-check-in'],
    keywords: ['guided', 'detailed', 'form', 'wizard', 'check-in', 'switch'],
    references: [],
    version: VERSION,
    lastReviewedAt: REVIEWED,
    contentClassification: 'App explanation',
    diagram: null,
    featured: false,
  },
  {
    id: 'assessment-explanation',
    title: 'How the assessment explanation works',
    category: 'astra-care',
    summary: 'The assessment explains each recorded value with its comparison, calculation and a bounded next step.',
    plainLanguageBody:
      'Each observation card separates what was recorded, what was calculated, a possible interpretation and a suggested next step. The interpretation is written as a comparison finding, not a diagnosis.',
    example:
      'If sleep is 25% below the fictional baseline, the card says the recorded value is lower, shows the arithmetic and notes that the difference does not identify a cause.',
    extendedExplanation:
      'The assessment is deterministic: it uses the stored readings, the fictional baseline and the configured 10% rule. It does not use a language model or the internet. It does not decide urgency, prescribe treatment or tell you to exercise, take medication, use oxygen or evacuate. Those decisions belong to approved mission procedures and the designated medical support team.',
    relatedMetricTypes: ['heartRate', 'bloodPressure', 'temperature', 'sleep'],
    relatedAppFeatures: ['assessment'],
    keywords: ['assessment', 'explanation', 'interpretation', 'review', 'diagnosis', 'rule'],
    references: [],
    version: VERSION,
    lastReviewedAt: REVIEWED,
    contentClassification: 'App explanation',
    diagram: null,
    featured: false,
  },
  {
    id: 'mission-health-replay',
    title: 'Understanding Mission Health Replay',
    category: 'astra-care',
    summary: 'Mission Health Replay steps through past check-ins as they existed at the time.',
    plainLanguageBody:
      'Each replay frame uses only observations recorded on or before that point, so a later check-in never changes an earlier frame. Replay is read-only: it does not edit records, create reports or change the active crew identity.',
    example:
      'Selecting an earlier check-in shows the values and review flags that would have been available then, not the values recorded after it.',
    extendedExplanation:
      'Replay is a presentation of stored records, not continuous monitoring or sensor streaming. Days without a check-in are not filled with invented measurements. The retrospective baseline note explains which baseline the frame uses. Playback can be paused and stepped manually.',
    relatedMetricTypes: ['timestamps'],
    relatedAppFeatures: ['replay', 'trends'],
    keywords: ['replay', 'history', 'timeline', 'historical', 'older', 'read-only'],
    references: [],
    version: VERSION,
    lastReviewedAt: REVIEWED,
    contentClassification: 'App explanation',
    diagram: 'timeline',
    featured: false,
  },
  {
    id: 'symptom-reporting',
    title: 'How symptom reporting works',
    category: 'astra-care',
    summary: 'Symptom reporting records where you feel something and describes it in your own words.',
    plainLanguageBody:
      'You can select a body region on the front or back view, choose a plain-language sensation, add an optional 1–5 discomfort rating and write a note. A text region list provides the same function without using the illustration.',
    example:
      '“Right shoulder · stiffness · 2 · worse after exercise” describes an experience without naming a disease or guessing a cause.',
    extendedExplanation:
      'The discomfort rating describes how noticeable the sensation feels to you; it is not a clinical pain scale or a triage category. Region selections are not diagnoses. General symptoms such as nausea or fatigue can be recorded as words without a body region. Saved entries appear in the health record and in confirmed report snapshots as text.',
    relatedMetricTypes: ['symptoms'],
    relatedAppFeatures: ['body-map', 'check-in', 'guided-check-in'],
    keywords: ['symptoms', 'body map', 'discomfort', 'pain', 'region', 'intensity', 'reporting'],
    references: ['S15'],
    version: VERSION,
    lastReviewedAt: REVIEWED,
    contentClassification: 'App explanation',
    diagram: null,
    featured: false,
  },
  {
    id: 'offline-report-queue',
    title: 'Understanding the offline report queue',
    category: 'astra-care',
    summary: 'The offline queue keeps a confirmed report on the device until it can be sent.',
    plainLanguageBody:
      'A report enters the outbox only after you confirm a preview. If the simulated link is unavailable, the report stays queued locally. You can retry sending, and the queue does not invent an acknowledgement.',
    example:
      'With the simulated link off, a confirmed report shows as queued. Turning the link on and retrying can move it to sending and then to acknowledged if the receiver responds.',
    extendedExplanation:
      'Queued, sending, failed and acknowledged are separate states. Queueing does not mean the ground has received anything. The queue is local to this device; it does not synchronize with another device or with the receiver’s timeline. Failed sends keep the report so it can be retried.',
    relatedMetricTypes: ['reports'],
    relatedAppFeatures: ['delivery', 'reports'],
    keywords: ['offline', 'queue', 'outbox', 'queued', 'send', 'retry', 'report'],
    references: [],
    version: VERSION,
    lastReviewedAt: REVIEWED,
    contentClassification: 'App explanation',
    diagram: null,
    featured: true,
  },
  {
    id: 'ground-acknowledgement',
    title: 'What a ground acknowledgement means',
    category: 'astra-care',
    summary: 'A ground acknowledgement means the simulated receiver confirmed it received the report.',
    plainLanguageBody:
      'Acknowledgement is based on a receipt returned by the local receiver. ASTRA CARE does not generate an acknowledgement on its own or mark a report acknowledged because a send was attempted.',
    example:
      'A report shows “acknowledged” only after the receiver returns a reference, and the delivery screen shows that reference.',
    extendedExplanation:
      'The simulated receiver checks the report payload and stores an integrity hash. It can reject invalid reports and handle duplicate submissions. This is a local simulation without production authentication or a hosted ground system. An acknowledgement confirms receipt by this simulator; it is not a flight surgeon’s review or a medical response.',
    relatedMetricTypes: ['reports'],
    relatedAppFeatures: ['delivery', 'reports'],
    keywords: ['acknowledgement', 'acknowledged', 'receipt', 'receiver', 'ground', 'confirmed'],
    references: [],
    version: VERSION,
    lastReviewedAt: REVIEWED,
    contentClassification: 'App explanation',
    diagram: null,
    featured: false,
  },
  {
    id: 'synthetic-demo-data',
    title: 'What synthetic demo data means',
    category: 'astra-care',
    summary: 'Synthetic demo data is generated for this prototype and is not a real astronaut’s record.',
    plainLanguageBody:
      'The crew identity, mission and personal baseline are fictional fixtures. Observations you enter are manual demo records. The app labels them as synthetic and does not present them as NASA data or live sensor readings.',
    example:
      '“Avery Rao” and the Meridian Transit mission are fictional. A check-in you save is your demo input, not a real flight record.',
    extendedExplanation:
      'Demo crew sessions use an in-memory repository that does not read or write the device store. Local sessions store records in IndexedDB on web or SQLite on native. Neither mode contacts a real medical system. Synthetic provenance is repeated in reports and replay so the distinction survives outside the original screen.',
    relatedMetricTypes: [],
    relatedAppFeatures: ['identify', 'mission-overview', 'reports'],
    keywords: ['synthetic', 'demo', 'fictional', 'fake', 'provenance', 'simulated', 'data'],
    references: [],
    version: VERSION,
    lastReviewedAt: REVIEWED,
    contentClassification: 'App explanation',
    diagram: null,
    featured: false,
  },
  {
    id: 'why-monitoring-matters',
    title: 'Why astronaut health monitoring matters',
    category: 'spaceflight',
    summary: 'Monitoring helps a crew notice changes and communicate them clearly, especially when help is far away.',
    plainLanguageBody:
      'Spaceflight exposes crews to radiation, altered gravity, isolation, confinement and distance from Earth. Regular records can support self-awareness and communication with ground support, but they do not replace medical judgement.',
    example:
      'A series of sleep and heart-rate records can give a crew member concrete information to discuss with the flight surgeon instead of relying on memory.',
    extendedExplanation:
      'NASA’s Human Research Program studies how these hazards affect human health and performance. Research findings inform operational standards and monitoring, but a prototype app with manual entries is not an operational medical system. ASTRA CARE is an educational demonstration and does not claim NASA approval or clinical validation.',
    relatedMetricTypes: ['heartRate', 'sleep', 'symptoms'],
    relatedAppFeatures: ['mission-overview', 'check-in'],
    keywords: ['monitoring', 'astronaut', 'health', 'why', 'spaceflight', 'ground', 'support'],
    references: ['S01', 'S02', 'S03', 'S25'],
    version: VERSION,
    lastReviewedAt: REVIEWED,
    contentClassification: 'Spaceflight research context',
    diagram: null,
    featured: false,
  },
  {
    id: 'communication-delays',
    title: 'Communication delays and medical autonomy',
    category: 'spaceflight',
    summary: 'Deep-space communication delays mean crews cannot always rely on immediate ground advice.',
    plainLanguageBody:
      'Radio signals take time to travel. Published NASA analyses describe Mars one-way delays of roughly 21–22 minutes, with additional blackouts possible. Lunar delays are much shorter, measured in seconds.',
    example:
      'A question sent to Earth during a Mars mission could wait about 20 minutes for an answer, and the reply could take another 20 minutes to arrive.',
    extendedExplanation:
      'Delays and blackouts make locally available information and clear records more important. They also mean an app should distinguish local storage from actual transmission. ASTRA CARE’s offline queue and knowledge library demonstrate that idea; they do not provide autonomous medical care. Exact delay values vary with orbital geometry and mission design.',
    relatedMetricTypes: ['reports', 'timestamps'],
    relatedAppFeatures: ['delivery', 'reports'],
    keywords: ['delay', 'communication', 'mars', 'autonomy', 'blackout', 'latency', 'ground'],
    references: ['S11', 'S12', 'S13', 'S26'],
    version: VERSION,
    lastReviewedAt: REVIEWED,
    contentClassification: 'Spaceflight research context',
    diagram: null,
    featured: false,
  },
  {
    id: 'five-hazards',
    title: 'The five hazards of human spaceflight',
    category: 'spaceflight',
    summary: 'NASA’s Human Research Program groups spaceflight health risks into five hazard themes.',
    plainLanguageBody:
      'The themes are space radiation, isolation and confinement, distance from Earth, gravity fields, and hostile or closed environments. They overlap and can affect each other.',
    example:
      'Isolation can affect mood and sleep, while altered gravity can affect the cardiovascular and musculoskeletal systems.',
    extendedExplanation:
      'The hazard framework is an organizing tool for research, not a diagnosis checklist. A symptom or reading cannot be attributed to one hazard without evidence. NASA and its partners study these hazards to inform standards, countermeasures and monitoring. ASTRA CARE uses the framework only as educational context.',
    relatedMetricTypes: [],
    relatedAppFeatures: ['mission-overview'],
    keywords: ['hazards', 'radiation', 'isolation', 'confinement', 'gravity', 'distance', 'environment'],
    references: ['S01', 'S03', 'S14'],
    version: VERSION,
    lastReviewedAt: REVIEWED,
    contentClassification: 'Spaceflight research context',
    diagram: null,
    featured: true,
  },
];
