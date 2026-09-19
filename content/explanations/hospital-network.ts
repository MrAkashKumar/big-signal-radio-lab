export interface RegionalHospitalNode {
  id: string;
  label: string;
  shortLabel: string;
  kind: "hospital" | "field-hospital" | "coordination";
  latitudeDeg: number;
  longitudeDeg: number;
  callSign?: string;
  note: string;
}
export interface RegionalHospitalLink {
  id: string;
  from: string;
  to: string;
  label: string;
  kind: "radio" | "patient-transfer";
  evidence: string;
  sourceUrl: string;
}
export const ORARI_ACCOUNT = "https://www.qsl.net/ab2qv/ares-tsunami.htm";
export const ORARI_BULLETIN =
  "https://ftp.unpad.ac.id/orari/orari-diklat/BeON/beon0411.pdf";
export const hospitalNetworkNodes: readonly RegionalHospitalNode[] = [
  {
    id: "meulaboh",
    label: "Cut Nyak Dhien Hospital · Meulaboh",
    shortLabel: "Meulaboh",
    kind: "hospital",
    latitudeDeg: 4.1559501,
    longitudeDeg: 96.1302815,
    callSign: "YB6ZAK",
    note: "Hospital radio station. Modern OSM hospital site used as geographic reference.",
  },
  {
    id: "lamno",
    label: "Lamno emergency hospital",
    shortLabel: "Lamno",
    kind: "field-hospital",
    latitudeDeg: 5.09,
    longitudeDeg: 95.37,
    callSign: "YB6ZAP",
    note: "Town-level pin; temporary hospital site unverified.",
  },
  {
    id: "calang",
    label: "Calang emergency hospital",
    shortLabel: "Calang",
    kind: "field-hospital",
    latitudeDeg: 4.64,
    longitudeDeg: 95.58,
    callSign: "YB6ZAW",
    note: "Town-level pin; temporary hospital site unverified.",
  },
  {
    id: "teunom",
    label: "Teunom emergency hospital",
    shortLabel: "Teunom",
    kind: "field-hospital",
    latitudeDeg: 4.39,
    longitudeDeg: 95.99,
    callSign: "YB6ZBB",
    note: "Town-level pin; temporary hospital site unverified.",
  },
  {
    id: "cut-meutia",
    label: "Cut Meutia Hospital · Lhokseumawe",
    shortLabel: "Cut Meutia",
    kind: "hospital",
    latitudeDeg: 5.12,
    longitudeDeg: 97.15,
    callSign: "YB6ZAV",
    note: "Station in physician housing. Approximate area pin.",
  },
  {
    id: "sigli",
    label: "Sigli hospital",
    shortLabel: "Sigli",
    kind: "hospital",
    latitudeDeg: 5.38,
    longitudeDeg: 95.96,
    callSign: "YB6ZAB",
    note: "Town-level pin; hospital building unverified.",
  },
  {
    id: "bireuen",
    label: "Dr Fauziah Hospital · Bireuen",
    shortLabel: "Bireuen",
    kind: "hospital",
    latitudeDeg: 5.2,
    longitudeDeg: 96.7,
    callSign: "YB6ZBC",
    note: "Documented station; approximate town location.",
  },
  {
    id: "melati",
    label: "Melati Hospital · Perbaungan",
    shortLabel: "Melati",
    kind: "hospital",
    latitudeDeg: 3.56613,
    longitudeDeg: 98.95903,
    note: "Radio command post. Modern site used as geographic reference.",
  },
  {
    id: "adam-malik",
    label: "Adam Malik Hospital · Medan",
    shortLabel: "Adam Malik",
    kind: "hospital",
    latitudeDeg: 3.51839,
    longitudeDeg: 98.60863,
    note: "Emergency-department command post. Modern site reference.",
  },
  {
    id: "polonia",
    label: "Polonia airbase · Medan net control",
    shortLabel: "Medan hub",
    kind: "coordination",
    latitudeDeg: 3.567,
    longitudeDeg: 98.67,
    callSign: "YB6ZES",
    note: "Coordination hub, not a hospital. Approximate airbase position.",
  },
  {
    id: "blang-bintang",
    label: "Blang Bintang airbase · Banda Aceh",
    shortLabel: "Banda airbase",
    kind: "coordination",
    latitudeDeg: 5.52,
    longitudeDeg: 95.42,
    callSign: "YB6ZAT",
    note: "Airbase radio station, not a hospital.",
  },
  {
    id: "lhoknga",
    label: "Lhoknga coastal station",
    shortLabel: "Lhoknga",
    kind: "coordination",
    latitudeDeg: 5.48,
    longitudeDeg: 95.24,
    callSign: "YB6ZAM",
    note: "Coastal radio station, not a hospital. Town-level pin.",
  },
  {
    id: "nias",
    label: "Nias island hospital · site unspecified",
    shortLabel: "Nias",
    kind: "hospital",
    latitudeDeg: 1.0,
    longitudeDeg: 97.5,
    callSign: "YB6ZAH",
    note: "Island-level marker only; hospital identity and site unverified.",
  },
];
export const hospitalNetworkLinks: readonly RegionalHospitalLink[] = [
  {
    id: "meulaboh-medan",
    from: "meulaboh",
    to: "polonia",
    label: "Meulaboh hospital → Medan net control",
    kind: "radio",
    evidence:
      "Medical staff and supply requests; contact reported by the hospital operator.",
    sourceUrl: ORARI_ACCOUNT,
  },
  {
    id: "meulaboh-banda",
    from: "meulaboh",
    to: "blang-bintang",
    label: "Meulaboh hospital → Banda airbase",
    kind: "radio",
    evidence: "Hospital operator reports contacting YB6ZAT for assistance.",
    sourceUrl: ORARI_ACCOUNT,
  },
  {
    id: "meulaboh-lhoknga",
    from: "meulaboh",
    to: "lhoknga",
    label: "Meulaboh hospital → Lhoknga station",
    kind: "radio",
    evidence: "Hospital operator also names YB6ZAM as a contact.",
    sourceUrl: ORARI_ACCOUNT,
  },
  {
    id: "cut-meutia-medan",
    from: "cut-meutia",
    to: "polonia",
    label: "Cut Meutia hospital → Medan net control",
    kind: "radio",
    evidence:
      "Medical needs passed to Medan; mobile station became a hospital base.",
    sourceUrl: ORARI_BULLETIN,
  },
  {
    id: "melati-adam-malik",
    from: "melati",
    to: "adam-malik",
    label: "Melati → Adam Malik · patient transfer",
    kind: "patient-transfer",
    evidence:
      "Some patients moved between these hospitals. This line records transfer, not a proven direct radio circuit.",
    sourceUrl: ORARI_ACCOUNT,
  },
];
export const hospitalNetworkCopy = {
  title: "When hospitals needed a voice.",
  subtitle: "Aceh & North Sumatra · December 2004–January 2005",
  introduction:
    "Hospitals could be hundreds of kilometres apart. Explore the places, follow a documented contact, then find a radio setup that can carry a request and its reply.",
  scope:
    "Documented hospital radio sites and coordination hubs from the sources below. This is not a complete register of every affected hospital. An unconnected pin means a station is documented but its individual contacts are not established here.",
  geography:
    "Coastlines follow the bundled Natural Earth map. Pins use approximate town or area locations unless a modern hospital site is identified. Distances are rounded great-circle separations, not roads, flight logs or radio path lengths. Nearby pins may be visually enlarged. No historical street plan or surveyed terrain is implied.",
  historicalLines:
    "Historical contacts and patient movement are separate layers of evidence. SEND IT tests your selected pair under assumed conditions; it does not replay a measured 2005 transmission or reconstruct the repeater network.",
  techniques: [
    {
      title: "HF across the region",
      body: "The Cut Meutia mobile team used 7.055 MHz HF to reach Medan. HF SSB is the simulation's voice assumption, not a recovered mode log.",
      url: ORARI_BULLETIN,
    },
    {
      title: "VHF close to the response",
      body: "Meulaboh volunteers coordinated on 145.500 MHz. The wider response also used 146.080 and 146.300 MHz repeaters. VHF FM is a simulation assumption. A repeater adds another station and another radio hop.",
      url: ORARI_ACCOUNT,
    },
    {
      title: "Operators made the handoffs",
      body: "A hospital need could be heard at net control and passed to relief coordinators. The practice below models one two-way radio hop. Delivery of supplies or a patient's transfer requires people and transport beyond that hop.",
      url: ORARI_BULLETIN,
    },
    {
      title: "No JS8Call in 2005",
      body: "JS8Call's first development release was in July 2018; public version 1.0 followed in April 2019. It could not have been used in this response. FT8 is a modern comparison. Other UHF settings are experiments, not recorded hospital links.",
      url: "https://js8call.com/JS8Call-improved/d6/d14/md_docs_2user__guide_2JS8Call__User__Guide.html",
    },
  ],
} as const;
