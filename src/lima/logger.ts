export function log(action: any, details?: any) {
  details = filterLogObject(details);

  console.log(action, details);
}

export function filterLogObject(o: any) {
  if (!o) return o;

  // deep clone
  o = JSON.parse(JSON.stringify(o));

  const maskFields = ["password", "input", "question"];

  if (typeof o == "object") {
    for (const key of Object.keys(o)) {
      let value = o[key];

      if (value) {
        if (typeof value == "object" || typeof value == "string") {
          value = filterLogObject(value);
        }

        if (maskFields.findIndex((a) => a == key) >= 0) {
          value = "*****";
        }
      }

      o[key] = value;
    }
  }

  if (typeof o == "string") {
    for (const fieldName of maskFields) {
      const re = new RegExp(`"${fieldName}":(\s*)"[^"]+"`, "g");
      o = o.replace(re, `"${fieldName}":$1"*****"`);
    }
  }

  return o;
}
