export const hospitalContent = {
  layoutNote:
    "Regional locations are approximate; modern hospital footprints, where available in Local terrain, are not a reconstruction of January 2005. The temporary hospitals' exact sites are unverified. Recorded contacts, patient transfers and your simulated links are different things.",
  familyTitle: "The message a family is waiting for.",
  familyStory:
    "Across the same tsunami response, amateur operators helped separated families find news of one another. VOA reported that Sanchita Saha in Calcutta learned through radio operators that her husband was alive in a Port Blair camp. For her, the message ended days of not knowing.",
  familyLimit:
    "That documented account is from India's Andaman Islands, not this Indonesian network. It confirms news of a loved one, not a documented physical reunion. The hospital message below is an illustrative exercise; relief and family-tracing teams handle the next steps.",
  medicalMessage:
    "Medan net control, this is the hospital station. We need additional medical staff and supplies. Please pass our request to the relief coordinator and confirm receipt. Over.",
  message:
    "Relief desk, this is the hospital radio station. With their permission, please help a survivor contact their family to say they are safe at the hospital. Please confirm this request was received. Over.",
  received:
    "Request received by the next operator in this exercise. The tracing team can now work on contacting the family. A working radio link enables that handoff; it does not establish that a reunion has happened.",
  radioNote:
    "The same RF engine, controls, WHY, MATH and comparison tools as the learning levels. Presets use approximate geographic positions and assumed antennas, output powers, noise and ionosphere conditions. UHF, FT8 and arbitrary settings are learning extensions. Changing distance creates a synthetic route; historical pins remain in place. Local building geometry does not feed the RF engine.",
  replyNote:
    "The return-link check assumes the other station has the same transmit power, receiver bandwidth and noise figure. It evaluates both directions with the engine. A voice-capable mode and two usable paths are required before passing the sample voice message.",
  experiments: [
    {
      title: "What even is radio?",
      lessonId: "what-is-radio",
      body: "Start with Meulaboh → Medan on 7.055 MHz. Pick a prediction and SEND IT. The engine evaluates a radio path without a phone network.",
    },
    {
      title: "Bigger signal",
      lessonId: "bigger-signal",
      body: "Pin a result as A. Change 5 W to 50 W and send again. Compare received power, then inspect the battery workbench.",
    },
    {
      title: "Distance is rude",
      lessonId: "distance-is-rude",
      body: "Choose Medan while keeping VHF. More watts cannot remove the radio horizon. Try HF, then inspect the returning path on Earth.",
    },
  ],
  sources: [
    {
      title: "Hospital stations and contacts · ORARI contributor account",
      url: "https://www.qsl.net/ab2qv/ares-tsunami.htm",
      note: "Contemporary operational account. Supports the network inventory, selected contacts, repeaters and Melati patient transfers.",
    },
    {
      title:
        "Hospital condition and departments · Singapore medical team, 2005",
      url: "https://annals.edu.sg/pdf/34VolNo9200510/V34N9p586.pdf",
      note: "Firsthand medical-team report, pages 587–588. Describes the inland hospital, staffing, theatres and triage.",
    },
    {
      title: "Field surgical theatre · PIONEER, 11 January 2005",
      url: "https://defencepioneer.sg/pioneer-articles/saf-field-surgical-theatre-in-operation",
      note: "Documents the tent's two areas, cooling and generator equipment.",
    },
    {
      title: "Wards and water supply · MSF, January 2005",
      url: "https://www.msf.org/overview-msf-activities-indonesia",
      note: "Operational report describing care areas, mosquito nets and water storage.",
    },
    {
      title: "Family reconnection through amateur radio · VOA tsunami report",
      url: "https://www.voanews.com/a/a-13-2005-01-05-voa24-66363817/546509.html",
      note: "Named family-contact example from India during the same disaster; not an Indonesian hospital reunion.",
    },
    {
      title: "Cut Meutia medical radio station · ORARI bulletin, April 2005",
      url: "https://ftp.unpad.ac.id/orari/orari-diklat/BeON/beon0411.pdf",
      note: "Documents the mobile medical team becoming a hospital base and contacting Medan.",
    },
    {
      title: "JS8Call official history",
      url: "https://js8call.com/JS8Call-improved/d6/d14/md_docs_2user__guide_2JS8Call__User__Guide.html",
      note: "Development releases began in 2018, long after this disaster.",
    },
    {
      title: "Adam Malik geographic reference · Indonesian Ministry of Health",
      url: "https://ditmutunakes.kemkes.go.id/index.php/detail-institusi/rsup-h-adam-malik/4d54417a",
      note: "Modern coordinates, not a 2005 architectural survey.",
    },
    {
      title: "Melati geographic reference · OpenStreetMap",
      url: "https://www.openstreetmap.org/node/9791489808",
      note: "Modern geographic reference; local terrain carries its own snapshot attribution.",
    },
  ],
} as const;
