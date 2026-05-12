// Deterministic Case Prep generator. Given (classification, language,
// urgency, query), returns a 1-page Case Prep with summary, framework,
// next_steps, and documents_to_gather — all keyed off a curated registry
// of Indian-law templates.
//
// Why deterministic wins here:
// - The legal framework for a typical consumer query is fixed. Section
//   138 of the NI Act doesn't change per user. An LLM rewriting it adds
//   hallucination risk for zero quality gain.
// - BCI Rule 36 compliance is structural (no case names, no judges, no
//   advocates ever appear because the template doesn't contain them).
// - Every output is auditable to a specific template version.

import type {
  Category,
  Language,
  Urgency
} from "./classify";

export interface FrameworkRef {
  act: string;
  section?: string;
  note?: string;
}

export interface CasePrep {
  summary: string;
  framework: FrameworkRef[];
  next_steps: string[];
  documents_to_gather: string[];
  urgency: Urgency;
  language: Language;
}

interface Template {
  summary: { en: string; hi?: string };
  framework: FrameworkRef[];
  next_steps: { en: string[]; hi?: string[] };
  documents_to_gather: { en: string[]; hi?: string[] };
}

// Registry. Each (category, urgency) pair routes to one of these. Urgency
// only affects framing of the summary line; the legal framework is
// category-defined. Extend by adding more keys.
const TEMPLATES: Record<Category, Template> = {
  criminal: {
    summary: {
      en: "Your situation involves a criminal-law matter under the Indian Penal Code / Bharatiya Nyaya Sanhita. The next steps below are general; do not delay if a deadline or hearing is imminent.",
      hi: "आपका मामला भारतीय दंड संहिता / भारतीय न्याय संहिता के अंतर्गत आपराधिक है। नीचे दिए गए कदम सामान्य हैं; यदि सुनवाई या समय-सीमा निकट है तो देर न करें।"
    },
    framework: [
      { act: "Bharatiya Nyaya Sanhita, 2023" },
      { act: "Bharatiya Nagarik Suraksha Sanhita, 2023", note: "procedural rules for FIR, bail, trial" }
    ],
    next_steps: {
      en: [
        "Note down dates, places and witnesses of the incident in writing.",
        "Preserve every communication and document — do not delete anything.",
        "Book a 15-minute consultation with a verified advocate before signing or responding to any document."
      ],
      hi: [
        "घटना की तारीख, स्थान और गवाहों को लिखित रूप में नोट कीजिए।",
        "हर बातचीत और दस्तावेज़ को सुरक्षित रखिए — कुछ भी डिलीट न कीजिए।",
        "किसी भी दस्तावेज़ पर हस्ताक्षर या उत्तर देने से पहले एक सत्यापित वकील से 15-मिनट का परामर्श कीजिए।"
      ]
    },
    documents_to_gather: {
      en: ["Government photo ID", "Copy of FIR / police complaint if any", "All written and digital communications relating to the incident"],
      hi: ["सरकारी फोटो पहचान-पत्र", "एफआईआर / पुलिस शिकायत की प्रति, यदि कोई हो", "घटना से संबंधित सभी लिखित और डिजिटल पत्राचार"]
    }
  },
  civil: {
    summary: {
      en: "Your situation is civil in nature — a private dispute typically resolved by notice or suit under the Code of Civil Procedure. A demand notice often resolves matters short of litigation.",
      hi: "आपका मामला दीवानी है — आमतौर पर सी.पी.सी. के तहत नोटिस या वाद से हल होने वाला व्यक्तिगत विवाद। सही ढंग से भेजा गया नोटिस अक्सर मुकदमे के बिना ही मामला सुलझा देता है।"
    },
    framework: [
      { act: "Code of Civil Procedure, 1908", note: "civil-suit procedure" },
      { act: "Indian Contract Act, 1872", note: "contractual obligations" },
      { act: "Limitation Act, 1963", note: "time-limits to file" }
    ],
    next_steps: {
      en: [
        "Write a one-page chronological summary of the dispute with dates and amounts.",
        "Send a formal legal notice giving the counter-party 15 days to comply.",
        "If no satisfactory reply, file a civil suit at the appropriate court within the limitation period."
      ],
      hi: [
        "विवाद का एक पन्ने का तिथिवार सारांश तैयार कीजिए।",
        "विधिवत कानूनी नोटिस भेजकर 15 दिन का समय दीजिए।",
        "संतोषजनक उत्तर न मिलने पर सीमा अवधि के भीतर उचित न्यायालय में दीवानी वाद दायर कीजिए।"
      ]
    },
    documents_to_gather: {
      en: ["Government photo ID", "All contracts, invoices, receipts and ledgers", "Prior correspondence (emails, WhatsApp)"],
      hi: ["सरकारी फोटो पहचान-पत्र", "सभी अनुबंध, चालान, रसीदें और बही-खाते", "पिछले पत्राचार (ईमेल, व्हाट्सऐप)"]
    }
  },
  family: {
    summary: {
      en: "Your situation is governed by Indian family law (personal law depending on religion + the Family Courts Act). Family disputes are best addressed early to preserve evidence and rights.",
      hi: "आपका मामला भारतीय पारिवारिक कानून के अंतर्गत आता है (धर्म-आधारित व्यक्तिगत कानून + पारिवारिक न्यायालय अधिनियम)। साक्ष्य और अधिकारों की सुरक्षा के लिए पारिवारिक विवादों का जल्द समाधान बेहतर है।"
    },
    framework: [
      { act: "Hindu Marriage Act, 1955" },
      { act: "Special Marriage Act, 1954" },
      { act: "Protection of Women from Domestic Violence Act, 2005", note: "if applicable" },
      { act: "Family Courts Act, 1984", note: "procedural" }
    ],
    next_steps: {
      en: [
        "Compile a written, dated chronology of events from the start of the marriage / relationship.",
        "Identify financial documents (joint accounts, property, jewellery, dowry items) and secure copies.",
        "Consult an advocate before initiating mediation or filing — do not move out of the home or sign documents until then."
      ],
      hi: [
        "विवाह / संबंध की शुरुआत से लेकर तिथिवार लिखित कालक्रम बनाइए।",
        "संयुक्त खाते, संपत्ति, आभूषण, दहेज सामग्री जैसे वित्तीय दस्तावेज़ों की प्रतियाँ सुरक्षित कीजिए।",
        "मध्यस्थता या याचिका दाखिल करने से पहले वकील से परामर्श कीजिए — तब तक घर न छोड़ें और कोई दस्तावेज़ हस्ताक्षरित न करें।"
      ]
    },
    documents_to_gather: {
      en: ["Marriage certificate", "Aadhaar / PAN of both parties", "Financial documents (bank statements, property papers)", "Photographs / messages establishing the relationship and the dispute"],
      hi: ["विवाह प्रमाण-पत्र", "दोनों पक्षों के आधार / पैन", "वित्तीय दस्तावेज़ (बैंक स्टेटमेंट, संपत्ति के कागज़ात)", "संबंध और विवाद को स्थापित करने वाले फोटो / संदेश"]
    }
  },
  property: {
    summary: {
      en: "Your situation involves a property or tenancy dispute. Most are governed by the Transfer of Property Act and state-level rent / RERA legislation. A written demand or notice is usually the first step.",
      hi: "आपका मामला संपत्ति या किरायेदारी से जुड़ा है। ज़्यादातर मामले संपत्ति अंतरण अधिनियम और राज्य-स्तरीय किराया / रेरा कानूनों के तहत आते हैं। लिखित मांग या नोटिस आमतौर पर पहला कदम है।"
    },
    framework: [
      { act: "Transfer of Property Act, 1882" },
      { act: "Real Estate (Regulation and Development) Act, 2016", note: "RERA — builder/developer disputes" },
      { act: "State Rent Control Act", note: "applies to residential tenancy" }
    ],
    next_steps: {
      en: [
        "Locate the rent agreement / sale deed / allotment letter and any addenda.",
        "Send a written notice (registered post with acknowledgement due) giving the counter-party a defined period to act.",
        "If no resolution, file under RERA (builder), Rent Control Tribunal (tenancy), or civil court (title)."
      ],
      hi: [
        "किराया अनुबंध / बिक्री-विलेख / आवंटन-पत्र और सभी परिशिष्ट खोज निकालिए।",
        "लिखित नोटिस (रजिस्टर्ड डाक ए.डी.) से सामने वाले पक्ष को निश्चित समय दीजिए।",
        "हल न होने पर रेरा (बिल्डर), किराया नियंत्रण अधिकरण (किरायेदारी), या दीवानी न्यायालय (स्वामित्व) में याचिका दीजिए।"
      ]
    },
    documents_to_gather: {
      en: ["Rent agreement / sale deed / allotment letter", "Last six months of rent / EMI receipts", "Photographs of the property and any damage", "All written communication with landlord / builder / tenant"],
      hi: ["किराया अनुबंध / बिक्री-विलेख / आवंटन-पत्र", "पिछले छह माह की किराया / ईएमआई रसीदें", "संपत्ति की और किसी भी क्षति की तस्वीरें", "मकान मालिक / बिल्डर / किरायेदार के साथ सभी लिखित पत्राचार"]
    }
  },
  consumer: {
    summary: {
      en: "Your situation falls under the Consumer Protection Act 2019. You can file a complaint in the District / State / National Consumer Commission depending on the value involved.",
      hi: "आपका मामला उपभोक्ता संरक्षण अधिनियम 2019 के अंतर्गत आता है। राशि के अनुसार आप जिला / राज्य / राष्ट्रीय उपभोक्ता आयोग में शिकायत दर्ज कर सकते हैं।"
    },
    framework: [
      { act: "Consumer Protection Act, 2019", section: "35", note: "filing a complaint" },
      { act: "Consumer Protection Act, 2019", section: "69", note: "two-year limitation from cause of action" }
    ],
    next_steps: {
      en: [
        "Try resolution through the seller's grievance channel and keep written proof of every attempt.",
        "If unresolved, draft a complaint under Section 35 with chronology, prayer and required reliefs.",
        "File in the District Commission (up to Rs 50 lakh), State (Rs 50 lakh-2 crore), or National (above Rs 2 crore)."
      ],
      hi: [
        "विक्रेता के शिकायत निवारण चैनल से समाधान का प्रयास कीजिए और हर प्रयास का लिखित प्रमाण रखिए।",
        "हल न होने पर धारा 35 के अंतर्गत क्रमबद्ध शिकायत, प्रार्थना और मांगी गई राहतों के साथ तैयार कीजिए।",
        "जिला आयोग (50 लाख तक), राज्य (50 लाख-2 करोड़) या राष्ट्रीय (2 करोड़ से अधिक) में दाखिल कीजिए।"
      ]
    },
    documents_to_gather: {
      en: ["Invoice / order confirmation", "All emails and chat transcripts with the seller", "Photographs of the defective product or evidence of deficient service", "Bank / UPI payment proof"],
      hi: ["चालान / ऑर्डर पुष्टिकरण", "विक्रेता के साथ सभी ईमेल और चैट", "दोषपूर्ण उत्पाद की तस्वीरें या सेवा में कमी का प्रमाण", "बैंक / यूपीआई भुगतान प्रमाण"]
    }
  },
  labour: {
    summary: {
      en: "Your situation involves labour or employment law. Salary, termination and PF disputes are typically remedied under the relevant labour code and EPFO grievance machinery.",
      hi: "आपका मामला श्रम या रोजगार कानून से जुड़ा है। वेतन, बर्खास्तगी और पीएफ विवाद सामान्यतः संबंधित श्रम संहिता और ईपीएफओ शिकायत प्रणाली के माध्यम से हल होते हैं।"
    },
    framework: [
      { act: "Industrial Disputes Act, 1947", note: "retrenchment, wrongful termination" },
      { act: "Code on Wages, 2019" },
      { act: "Employees' Provident Funds Act, 1952", note: "EPF dues" },
      { act: "Payment of Gratuity Act, 1972" }
    ],
    next_steps: {
      en: [
        "Compile your appointment letter, every salary slip and email correspondence about the dispute.",
        "Send a formal written grievance to HR demanding the action you want, with a 15-day deadline.",
        "If unresolved, approach the Labour Commissioner, EPFO grievance portal, or appropriate civil court."
      ],
      hi: [
        "नियुक्ति-पत्र, हर वेतन-पर्ची और विवाद से जुड़े ईमेल इकट्ठा कीजिए।",
        "एचआर को 15 दिन की समय-सीमा देकर लिखित शिकायत भेजिए।",
        "हल न होने पर श्रम आयुक्त, ईपीएफओ शिकायत पोर्टल या उचित न्यायालय जाइए।"
      ]
    },
    documents_to_gather: {
      en: ["Appointment letter and any subsequent amendments", "Last 12 months of pay slips and Form 16", "All emails on the dispute", "EPF/UAN passbook"],
      hi: ["नियुक्ति-पत्र और बाद के संशोधन", "पिछले 12 माह की वेतन-पर्चियाँ और फॉर्म 16", "विवाद से जुड़े सभी ईमेल", "ईपीएफ/यूएएन पासबुक"]
    }
  },
  corporate: {
    summary: {
      en: "Your situation is governed by the Companies Act 2013 and (for insolvency) the IBC 2016. Matters typically involve directors, shareholders, ROC compliance or NCLT proceedings.",
      hi: "आपका मामला कंपनी अधिनियम 2013 और (दिवालिया मामलों में) आईबीसी 2016 के तहत आता है। प्रायः निदेशक, शेयरधारक, आरओसी अनुपालन या एनसीएलटी की कार्यवाही शामिल होती है।"
    },
    framework: [
      { act: "Companies Act, 2013" },
      { act: "Insolvency and Bankruptcy Code, 2016", note: "winding up / restructuring" },
      { act: "SEBI (Listing Obligations and Disclosure Requirements) Regulations, 2015", note: "listed company disclosures" }
    ],
    next_steps: {
      en: [
        "Collect the company's MOA, AOA, board resolutions and ROC filings relevant to the dispute.",
        "If shareholders disagree, attempt resolution via a board meeting with formal minutes.",
        "Escalate to NCLT for oppression / mismanagement, or to ROC for compliance breaches."
      ],
      hi: [
        "विवाद से संबंधित कंपनी का एमओए, एओए, बोर्ड संकल्प और आरओसी फाइलिंग एकत्र कीजिए।",
        "शेयरधारक असहमति की स्थिति में औपचारिक मिनट्स के साथ बोर्ड बैठक से समाधान का प्रयास कीजिए।",
        "उत्पीड़न/कुप्रबंधन के लिए एनसीएलटी, अनुपालन उल्लंघन के लिए आरओसी तक मामला बढ़ाइए।"
      ]
    },
    documents_to_gather: {
      en: ["MOA, AOA, shareholders' agreement", "Last three years of annual returns", "Board and committee resolutions on the disputed matter", "All emails between directors / shareholders"],
      hi: ["एमओए, एओए, शेयरधारक समझौता", "पिछले तीन वर्षों की वार्षिक रिटर्न्स", "विवादित मामले पर बोर्ड और समिति संकल्प", "निदेशकों / शेयरधारकों के बीच सभी ईमेल"]
    }
  },
  tax: {
    summary: {
      en: "Your situation is a tax matter. Most notices are remediable through a timely reply or appellate proceeding. Missing the response window can convert a minor notice into a penalty.",
      hi: "आपका मामला कर से जुड़ा है। अधिकांश नोटिसों का समय पर उत्तर देकर समाधान संभव है। उत्तर की समय-सीमा चूकने पर मामूली नोटिस भी जुर्माने में बदल सकता है।"
    },
    framework: [
      { act: "Income-tax Act, 1961" },
      { act: "Central Goods and Services Tax Act, 2017" },
      { act: "Finance Act of the relevant year", note: "annual amendments" }
    ],
    next_steps: {
      en: [
        "Read the notice carefully and note the section under which it is issued and the response deadline.",
        "Gather all return filings, bank statements and supporting evidence for the disputed entries.",
        "File a reply within the deadline; if rejected, appeal to the Commissioner (Appeals) within the limitation period."
      ],
      hi: [
        "नोटिस ध्यान से पढ़िए और जिस धारा के तहत जारी है तथा उत्तर देने की समय-सीमा नोट कीजिए।",
        "विवादित प्रविष्टियों के लिए सभी रिटर्न, बैंक स्टेटमेंट और प्रमाणक एकत्र कीजिए।",
        "समय-सीमा के भीतर उत्तर दाखिल कीजिए; अस्वीकृत होने पर निर्धारित अवधि के भीतर आयुक्त (अपील) में अपील कीजिए।"
      ]
    },
    documents_to_gather: {
      en: ["The notice itself (PDF, with DIN if any)", "Filed returns for the relevant years", "Bank statements and ledger extracts for disputed items", "PAN, Aadhaar and registration certificates"],
      hi: ["नोटिस की प्रति (डीआईएन सहित यदि कोई हो)", "संबंधित वर्षों की दाखिल रिटर्न्स", "विवादित मदों के बैंक स्टेटमेंट और लेजर", "पैन, आधार और पंजीकरण प्रमाण-पत्र"]
    }
  },
  cyber: {
    summary: {
      en: "Your situation involves cybercrime or a digital-rights violation. Time is critical — bank reversals are sometimes possible only within hours of the incident.",
      hi: "आपका मामला साइबर अपराध या डिजिटल अधिकार उल्लंघन से जुड़ा है। समय बहुत महत्वपूर्ण है — बैंक से धन वापसी कभी-कभी घटना के कुछ ही घंटों के भीतर ही संभव होती है।"
    },
    framework: [
      { act: "Information Technology Act, 2000", section: "66 / 67 / 69" },
      { act: "Digital Personal Data Protection Act, 2023", note: "personal data breaches" },
      { act: "Bharatiya Nyaya Sanhita, 2023", note: "for related offences such as cheating or impersonation" }
    ],
    next_steps: {
      en: [
        "Immediately call 1930 (National Cyber Crime Helpline) and log a complaint at cybercrime.gov.in.",
        "Freeze affected bank / UPI accounts through your bank's emergency channel.",
        "Preserve every screenshot, transaction id, message and email — do not delete or modify."
      ],
      hi: [
        "तुरंत 1930 (नेशनल साइबर क्राइम हेल्पलाइन) पर कॉल कीजिए और cybercrime.gov.in पर शिकायत दर्ज कीजिए।",
        "अपने बैंक के आपातकालीन चैनल से प्रभावित बैंक / यूपीआई खाते रोक दीजिए।",
        "हर स्क्रीनशॉट, लेन-देन आईडी, संदेश और ईमेल सुरक्षित रखिए — कुछ भी डिलीट या परिवर्तित न कीजिए।"
      ]
    },
    documents_to_gather: {
      en: ["Screenshots of fraudulent transactions / messages", "Bank statement showing the disputed entries", "Cybercrime portal complaint reference number", "Your government photo ID"],
      hi: ["धोखाधड़ी से जुड़े लेन-देन / संदेशों के स्क्रीनशॉट", "विवादित प्रविष्टियों वाला बैंक स्टेटमेंट", "साइबर क्राइम पोर्टल शिकायत संदर्भ संख्या", "आपका सरकारी फोटो पहचान-पत्र"]
    }
  },
  other: {
    summary: {
      en: "Your situation does not match a standard category. The general approach below applies; consider booking a consultation to identify the correct framework.",
      hi: "आपका मामला मानक श्रेणी में नहीं आता। नीचे दिया गया सामान्य दृष्टिकोण लागू होता है; सही ढाँचा पहचानने के लिए परामर्श लेने पर विचार कीजिए।"
    },
    framework: [
      { act: "General civil procedure (CPC, 1908)", note: "default civil remedy" }
    ],
    next_steps: {
      en: [
        "Write a one-page chronological summary of the events.",
        "Gather every document referenced in your summary.",
        "Book a 15-minute consultation with a qualified advocate."
      ],
      hi: [
        "घटनाओं का एक पन्ने का तिथिवार सारांश लिखिए।",
        "अपने सारांश में उल्लिखित हर दस्तावेज़ इकट्ठा कीजिए।",
        "किसी योग्य वकील से 15-मिनट का परामर्श कीजिए।"
      ]
    },
    documents_to_gather: {
      en: ["Government photo ID", "Documentary proof of the dispute", "Prior correspondence (emails, WhatsApp)"],
      hi: ["सरकारी फोटो पहचान-पत्र", "विवाद का दस्तावेज़ी प्रमाण", "पिछले पत्राचार (ईमेल, व्हाट्सऐप)"]
    }
  }
};

const HI_FALLBACK_LANGS: ReadonlySet<Language> = new Set(["hi", "mr"]);

export function generateCasePrep(args: {
  classification: Category;
  language: Language;
  urgency: Urgency;
}): CasePrep {
  const t = TEMPLATES[args.classification] ?? TEMPLATES.other;
  const useHi = HI_FALLBACK_LANGS.has(args.language);
  const pickStr = (en: string, hi?: string) => (useHi && hi ? hi : en);
  const pickArr = (en: string[], hi?: string[]) => (useHi && hi ? hi : en);

  let summary = pickStr(t.summary.en, t.summary.hi);
  if (args.urgency === "critical") {
    summary =
      (useHi ? "तत्काल कार्रवाई आवश्यक: " : "Immediate action required: ") + summary;
  } else if (args.urgency === "high") {
    summary =
      (useHi ? "जल्दी कार्रवाई करें: " : "Move quickly: ") + summary;
  }

  return {
    summary,
    framework: t.framework,
    next_steps: pickArr(t.next_steps.en, t.next_steps.hi),
    documents_to_gather: pickArr(t.documents_to_gather.en, t.documents_to_gather.hi),
    urgency: args.urgency,
    language: args.language
  };
}
