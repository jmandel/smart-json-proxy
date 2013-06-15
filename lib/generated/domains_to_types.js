module.exports = [
  ["drugName", "CodedValue"],
  ["frequency", "ValueAndUnit"],
  ["quantityDispensed", "ValueAndUnit"],
  ["quantity", "ValueAndUnit"],
  ["pharmacy", "Pharmacy"],
  ["address", "v:Address"],
  ["name", "v:Name"],
  ["bloodPressure", "BloodPressure"],
  ["bodyPosition", "CodedValue"],
  ["bodySite", "CodedValue"],
  ["systolic", ["VitalSign", "ValueAndUnit"]],
  ["diastolic", ["VitalSign", "ValueAndUnit"]],
  ["height", ["VitalSign", "ValueAndUnit"]],
  ["weight", ["VitalSign", "ValueAndUnit"]],
  ["vitalName", "CodedValue"],
  ["encounterType", "CodedValue"],
  ["provider", "Provider"],
  ["payload", "Response"],
  ["phone", "v:Tel"],
  ["medicalRecordNumber", "Code"]
];


