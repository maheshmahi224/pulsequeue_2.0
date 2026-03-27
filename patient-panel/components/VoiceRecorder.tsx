"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Volume2, Globe, CheckCircle, X } from "lucide-react";

const INDIAN_LANGUAGES = [
  { code: "en-IN", label: "English (India)", flag: "🇮🇳" },
  { code: "hi-IN", label: "Hindi (हिन्दी)", flag: "🇮🇳" },
  { code: "te-IN", label: "Telugu (తెలుగు)", flag: "🇮🇳" },
  { code: "ta-IN", label: "Tamil (தமிழ்)", flag: "🇮🇳" },
  { code: "kn-IN", label: "Kannada (ಕನ್ನಡ)", flag: "🇮🇳" },
  { code: "ml-IN", label: "Malayalam (മലയാളം)", flag: "🇮🇳" },
  { code: "mr-IN", label: "Marathi (मराठी)", flag: "🇮🇳" },
  { code: "bn-IN", label: "Bengali (বাংলা)", flag: "🇮🇳" },
  { code: "gu-IN", label: "Gujarati (ગુજરાતી)", flag: "🇮🇳" },
  { code: "pa-IN", label: "Punjabi (ਪੰਜਾਬੀ)", flag: "🇮🇳" },
  { code: "ur-IN", label: "Urdu (اردو)", flag: "🇮🇳" },
];

// Symptom keyword map (multi-lang keywords → symptom chip label)
const SYMPTOM_KEYWORDS: Record<string, string[]> = {
  "Chest Pain":          ["chest pain", "chest ache", "seene mein dard", "chest dard", "eedum noppi", "nenjappam", "mardana chest"],
  "Shortness of Breath": ["breathless", "short of breath", "saans", "breathing", "dysphea", "ubbasum"],
  "Headache":            ["headache", "head pain", "sir dard", "talaivali", "talachi noppi", "mathake novu"],
  "Fever":               ["fever", "bukhar", "jwara", "kaichal", "jvaram", "jwara"],
  "Nausea":              ["nausea", "ulti", "vomiting feel", "veeyam", "vichaaram", "vanthi"],
  "Vomiting":            ["vomiting", "ulti", "throw up", "mantham"],
  "Dizziness":           ["dizzy", "dizziness", "chakkar", "talai suttral", "maatha thirugutundi", "talaichutti"],
  "Fatigue":             ["tired", "fatigue", "exhausted", "thakaan", "sakthi illai", "shakti illadu"],
  "Cough":               ["cough", "khansi", "irumal", "daggutunna", "kasham"],
  "Back Pain":           ["back pain", "kamar", "mughu noppi", "belt pain", "bayya noppi"],
  "Abdominal Pain":      ["stomach", "tummy pain", "pet dard", "vayiru noppi", "kaligu noppi"],
  "Joint Pain":          ["joint pain", "arthritis", "joints", "gathiya"],
  "Swelling":            ["swelling", "soojan", "oodam", "vellipu"],
  "Palpitations":        ["heart beat", "palpitation", "dhak dhak", "heart racing"],
  "Numbness":            ["numb", "numbness", "sunjatta", "maram"],
  "Blurred Vision":      ["blurred vision", "vision loss", "aanji", "paarvai"],
  "Seizure":             ["seizure", "fits", "mirgi", "valikku"],
  "Loss of Consciousness":["unconscious", "faint", "behosh", "murchha"],
  "Skin Rash":           ["rash", "itching", "khujli", "soriya", "changu"],
  "Chest Tightness":     ["chest tight", "tight chest", "seena tight", "oppression chest"],
  "Cold / Flu":          ["cold", "flu", "runny nose", "sardi", "thodam"],
  "Sore Throat":         ["sore throat", "throat pain", "gale mein", "kuzhal noppi"],
  "Body Ache":           ["body ache", "badan dard", "udambu noppi", "full body pain"],
  "Sweating":            ["sweating", "sweats", "pasina", "velarvai"],
  "Weakness":            ["weakness", "weak", "kamzori", "shakti"],
  "Dry Mouth":           ["dry mouth", "mouth dry", "thirst", "pyaas"],
  "Loss of Appetite":    ["no appetite", "not eating", "bhooka nahi", "pasi illai"],
  "Jaundice":            ["jaundice", "yellow skin", "pagadu"],
  "Urinary Problem":     ["urine pain", "burning urine", "peshab"],
  "Constipation":        ["constipation", "no stool", "qabz"],
  "Diarrhea":            ["diarrhea", "loose motion", "dast"],
  "Eye Pain":            ["eye pain", "eye red", "aankhon mein"],
  "Ear Pain":            ["ear pain", "ear ache", "kaan dard"],
};

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  onSymptomDetected: (symptom: string) => void;
  compact?: boolean;
}

export default function VoiceRecorder({ onTranscript, onSymptomDetected, compact = false }: VoiceRecorderProps) {
  const [isListening, setIsListening] = useState(false);
  const [lang, setLang] = useState("en-IN");
  const [interim, setInterim] = useState("");
  const [finalText, setFinalText] = useState("");
  const [detectedSymptoms, setDetectedSymptoms] = useState<string[]>([]);
  const [supported, setSupported] = useState(true);
  const [showLang, setShowLang] = useState(false);
  const [pulseLevel, setPulseLevel] = useState(0);
  const recognitionRef = useRef<any>(null);
  const pulseRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) setSupported(false);
    }
    return () => { stopListening(); };
  }, []);

  const detectSymptoms = useCallback((text: string) => {
    const lower = text.toLowerCase();
    const found: string[] = [];
    for (const [symptom, keywords] of Object.entries(SYMPTOM_KEYWORDS)) {
      if (keywords.some(kw => lower.includes(kw))) {
        found.push(symptom);
      }
    }
    return found;
  }, []);

  const startListening = useCallback(() => {
    if (!supported) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interimT = "";
      let finalT = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalT += transcript + " ";
          // Detect symptoms from final text
          const found = detectSymptoms(finalT);
          found.forEach(s => {
            if (!detectedSymptoms.includes(s)) {
              setDetectedSymptoms(prev => [...prev, s]);
              onSymptomDetected(s);
            }
          });
          onTranscript(finalT.trim());
          setFinalText(prev => prev + " " + finalT.trim());
        } else {
          interimT += transcript;
        }
      }
      setInterim(interimT);
      // Pulse animation
      setPulseLevel(Math.random() * 100);
    };

    recognition.onerror = () => { setIsListening(false); };
    recognition.onend = () => { if (isListening) recognition.start(); };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);

    // Animate pulse
    pulseRef.current = setInterval(() => {
      setPulseLevel(prev => (prev > 10 ? prev * 0.92 : Math.random() * 40));
    }, 100);
  }, [lang, supported, detectedSymptoms, onTranscript, onSymptomDetected, isListening, detectSymptoms]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setInterim("");
    clearInterval(pulseRef.current);
    setPulseLevel(0);
  }, []);

  const clearAll = () => {
    setFinalText(""); setInterim(""); setDetectedSymptoms([]);
  };

  const selectedLang = INDIAN_LANGUAGES.find(l => l.code === lang)!;

  if (!supported) return (
    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
      <Volume2 className="w-4 h-4 shrink-0" />
      Voice input requires Chrome or Edge browser. Please use a supported browser.
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-xs font-bold text-blue-900">Voice Health Assistant</div>
            <div className="text-xs text-blue-500">Speak your symptoms in any Indian language</div>
          </div>
        </div>
        {/* Language selector */}
        <div className="relative">
          <button
            onClick={() => setShowLang(!showLang)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 rounded-xl text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-all shadow-sm"
          >
            <Globe className="w-3.5 h-3.5" />
            {selectedLang.flag} {selectedLang.label.split(" ")[0]}
          </button>
          {showLang && (
            <div className="absolute right-0 top-8 z-50 bg-white border border-gray-100 rounded-2xl shadow-xl p-1.5 min-w-[200px] max-h-64 overflow-y-auto animate-scale-in">
              {INDIAN_LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => { setLang(l.code); setShowLang(false); stopListening(); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left transition-colors ${
                    lang === l.code ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span>{l.flag}</span>
                  {l.label}
                  {lang === l.code && <CheckCircle className="w-3.5 h-3.5 text-blue-500 ml-auto" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main mic button + waveform */}
      <div className="flex items-center gap-4">
        <button
          onClick={isListening ? stopListening : startListening}
          className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 shrink-0 ${
            isListening
              ? "bg-red-500 shadow-red-200 scale-110 hover:bg-red-600"
              : "bg-blue-600 shadow-blue-200 hover:bg-blue-700 hover:scale-105"
          }`}
        >
          {isListening && (
            <>
              <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />
              <span className="absolute inset-[-4px] rounded-full border-2 border-red-300 animate-ping opacity-20" />
            </>
          )}
          {isListening
            ? <MicOff className="w-6 h-6 text-white relative z-10" />
            : <Mic className="w-6 h-6 text-white relative z-10" />
          }
        </button>

        <div className="flex-1 space-y-2">
          {/* Waveform bars */}
          <div className="flex items-end gap-0.5 h-10">
            {Array.from({ length: 30 }).map((_, i) => {
              const height = isListening
                ? Math.max(4, Math.sin(i * 0.8 + pulseLevel / 25) * 20 + 20 + Math.random() * 10)
                : 4;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-all duration-150 ${
                    isListening ? "bg-blue-500" : "bg-gray-200"
                  }`}
                  style={{ height: `${height}px` }}
                />
              );
            })}
          </div>
          <div className="text-xs text-gray-500">
            {isListening
              ? <span className="text-red-600 font-semibold animate-pulse">● Recording... speak now</span>
              : "Click mic to start voice input"
            }
          </div>
        </div>
      </div>

      {/* Live transcript */}
      {(interim || finalText) && (
        <div className="bg-white rounded-xl border border-blue-100 p-3 space-y-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-600">Transcript</span>
            <button onClick={clearAll} className="text-gray-400 hover:text-red-500 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {finalText && <p className="text-sm text-gray-800">{finalText}</p>}
          {interim && <p className="text-sm text-gray-400 italic">{interim}...</p>}
        </div>
      )}

      {/* Detected symptoms */}
      {detectedSymptoms.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-blue-700 mb-1.5 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            Auto-detected symptoms:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {detectedSymptoms.map(s => (
              <span key={s} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-semibold animate-scale-in">
                <CheckCircle className="w-3 h-3" /> {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
