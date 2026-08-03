import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const variablesPath = path.join(root, "android", "variables.gradle");
const buildGradlePath = path.join(root, "android", "app", "build.gradle");
const manifestPath = path.join(root, "android", "app", "src", "main", "AndroidManifest.xml");
const stringsPath = path.join(root, "android", "app", "src", "main", "res", "values", "strings.xml");
const packagePath = path.join(root, "package.json");

function replaceIfExists(filePath, replacer) {
  if (!fs.existsSync(filePath)) throw new Error(`Arquivo Android não encontrado: ${filePath}`);
  const current = fs.readFileSync(filePath, "utf8");
  const next = replacer(current);
  if (next !== current) fs.writeFileSync(filePath, next);
}

function getPackageVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    return pkg.version || "1.1.0";
  } catch {
    return "1.1.0";
  }
}

const versionCode = Number(process.env.ANDROID_VERSION_CODE || process.env.GITHUB_RUN_NUMBER || 1);
const versionName = process.env.ANDROID_VERSION_NAME || getPackageVersion();
const hasSigningSecrets = Boolean(
  process.env.ANDROID_KEYSTORE_PASSWORD &&
  process.env.ANDROID_KEY_ALIAS &&
  process.env.ANDROID_KEY_PASSWORD,
);

replaceIfExists(variablesPath, content => content
  .replace(/compileSdkVersion\s*=\s*\d+/g, "compileSdkVersion = 36")
  .replace(/targetSdkVersion\s*=\s*\d+/g, "targetSdkVersion = 36")
  .replace(/minSdkVersion\s*=\s*\d+/g, "minSdkVersion = 24"));

replaceIfExists(manifestPath, content => {
  let next = content;
  const permissions = [
    '<uses-permission android:name="android.permission.INTERNET" />',
    '<uses-permission android:name="android.permission.CAMERA" />',
    '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
  ];
  for (const permission of permissions) {
    if (!next.includes(permission)) next = next.replace(/(<manifest[^>]*>)/, `$1\n    ${permission}`);
  }
  if (!next.includes("android:usesCleartextTraffic")) {
    next = next.replace("<application", '<application android:usesCleartextTraffic="false"');
  }
  next = next.replace(/android:label="[^"]*"/g, 'android:label="SindCopilot"');
  return next;
});

replaceIfExists(stringsPath, content => content
  .replace(/<string name="app_name">[^<]*<\/string>/, '<string name="app_name">SindCopilot</string>')
  .replace(/<string name="title_activity_main">[^<]*<\/string>/, '<string name="title_activity_main">SindCopilot</string>'));

replaceIfExists(buildGradlePath, content => {
  let next = content
    .replace(/versionCode\s+\d+/g, `versionCode ${versionCode}`)
    .replace(/versionName\s+["'][^"']+["']/g, `versionName "${versionName}"`);

  if (hasSigningSecrets && !next.includes("sindcopilotRelease")) {
    next = next.replace(
      /android\s*\{/,
      `android {\n    signingConfigs {\n        sindcopilotRelease {\n            storeFile file("sindcopilot-release.jks")\n            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")\n            keyAlias System.getenv("ANDROID_KEY_ALIAS")\n            keyPassword System.getenv("ANDROID_KEY_PASSWORD")\n            enableV1Signing true\n            enableV2Signing true\n            enableV3Signing true\n            enableV4Signing true\n        }\n    }`,
    );
    next = next.replace(/release\s*\{/, "release {\n            signingConfig signingConfigs.sindcopilotRelease");
  }

  return next;
});

console.log(`SindCopilot Android patched: versionCode=${versionCode}, versionName=${versionName}, targetSdk=36, signed=${hasSigningSecrets}`);
