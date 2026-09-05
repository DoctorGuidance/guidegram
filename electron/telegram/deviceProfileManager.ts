import os from 'os'

export interface DeviceProfile {
  deviceModel: string
  systemVersion: string
  appVersion: string
  systemLangCode: string
  langCode: string
}

interface WindowsModelSpec {
  vendor: string
  models: string[]
}

const WINDOWS_SPECS: WindowsModelSpec[] = [
  {
    vendor: 'Dell',
    models: [
      'Latitude 5430',
      'Latitude 5440',
      'Latitude 5530',
      'Latitude 5540',
      'Latitude 7430',
      'Latitude 7440',
      'XPS 13 Plus 9320',
      'XPS 14 9440',
      'XPS 15 9520',
      'XPS 15 9530',
      'XPS 16 9640',
      'Inspiron 15 3520',
      'Inspiron 16 5630',
      'Inspiron 14 Plus 7440',
      'Precision 3581',
      'Precision 5680',
      'Vostro 3520',
      'Vostro 5630',
      'Alienware m16 R2',
    ],
  },
  {
    vendor: 'Lenovo',
    models: [
      'ThinkPad T14 Gen 3',
      'ThinkPad T14 Gen 4',
      'ThinkPad T14 Gen 5',
      'ThinkPad T14s Gen 4',
      'ThinkPad T16 Gen 2',
      'ThinkPad X1 Carbon Gen 10',
      'ThinkPad X1 Carbon Gen 11',
      'ThinkPad X1 Carbon Gen 12',
      'ThinkPad X1 Yoga Gen 8',
      'ThinkPad E14 Gen 5',
      'ThinkPad E16 Gen 1',
      'ThinkPad L14 Gen 4',
      'ThinkPad P14s Gen 4',
      'ThinkPad P16s Gen 2',
      'IdeaPad 3 15IAU7',
      'IdeaPad 5 14IAL7',
      'IdeaPad Slim 3 15IRH8',
      'IdeaPad Slim 5 16IRL8',
      'IdeaPad Pro 5 16ARP8',
      'Legion Pro 5 16IRX8',
      'Legion Slim 5 16IRH8',
      'Yoga 7 14IRL8',
      'Yoga Slim 7 Pro',
    ],
  },
  {
    vendor: 'HP',
    models: [
      'EliteBook 840 G8',
      'EliteBook 840 G9',
      'EliteBook 840 G10',
      'EliteBook 845 G10',
      'EliteBook 650 G9',
      'EliteBook 650 G10',
      'EliteBook x360 830 G9',
      'ProBook 440 G9',
      'ProBook 440 G10',
      'ProBook 450 G9',
      'ProBook 450 G10',
      'ProBook 455 G10',
      'Pavilion 15-eg3000',
      'Pavilion Plus 14-eh1000',
      'Pavilion Aero 13-be2000',
      'Envy 16-h1000',
      'Envy x360 15-fe0000',
      'Spectre x360 14-ef2000',
      'Spectre x360 16-f2000',
      'OMEN 16-wf0000',
      'Victus 16-r0000',
      'HP 250 G9',
      'HP 250 G10',
    ],
  },
  {
    vendor: 'ASUS',
    models: [
      'Zenbook 14 OLED UX3402',
      'Zenbook 14 OLED UX3405',
      'Zenbook 15 OLED UM3504',
      'Zenbook Pro 14 OLED UX6404',
      'Vivobook 15 X1504',
      'Vivobook 16 X1605',
      'Vivobook S 15 OLED K5504',
      'Vivobook Pro 15 OLED K6502',
      'ExpertBook B1 B1502',
      'ExpertBook B5 B5402',
      'ExpertBook B9 B9400',
      'ROG Zephyrus G14 GA402',
      'ROG Zephyrus G16 GU603',
      'ROG Strix G16 G614',
      'TUF Gaming A15 FA507',
      'TUF Gaming F15 FX507',
    ],
  },
  {
    vendor: 'Acer',
    models: [
      'Aspire 3 A315-59',
      'Aspire 5 A515-58M',
      'Aspire 7 A715-76G',
      'Swift 3 SF314-512',
      'Swift Go 14 SFG14-71',
      'Swift Go 16 SFG16-71',
      'Swift X 14 SFX14-71G',
      'Extensa 15 EX215-55',
      'Nitro 5 AN515-58',
      'Nitro 16 AN16-41',
      'Predator Helios 16 PH16-71',
    ],
  },
  {
    vendor: 'Microsoft',
    models: [
      'Surface Pro 8',
      'Surface Pro 9',
      'Surface Pro 10',
      'Surface Laptop 4',
      'Surface Laptop 5',
      'Surface Laptop 6',
      'Surface Laptop Studio',
      'Surface Laptop Studio 2',
      'Surface Laptop Go 3',
    ],
  },
  {
    vendor: 'MSI',
    models: [
      'Modern 14 C12M',
      'Modern 15 B12M',
      'Prestige 14 Evo B13M',
      'Prestige 16 Studio A13V',
      'Katana 15 B13V',
      'Stealth 16 Studio A13V',
    ],
  },
  {
    vendor: 'Desktop Custom',
    models: [
      'PC 64bit',
      'Custom Desktop PC',
      'System Product Name',
      'MS-7D25 Desktop',
      'B650 Gaming Desktop',
      'Z790 Workstation PC',
    ],
  },
]

interface WindowsBuild {
  osName: string
  majorBuild: number
  ubrRange: [number, number]
  editions: string[]
}

const WINDOWS_BUILDS: WindowsBuild[] = [
  {
    osName: 'Windows 11',
    majorBuild: 26200,
    ubrRange: [5000, 5200],
    editions: ['Pro', 'Home', 'Enterprise'],
  },
  {
    osName: 'Windows 11',
    majorBuild: 26240,
    ubrRange: [5000, 5250],
    editions: ['Pro', 'Enterprise'],
  },
  {
    osName: 'Windows 11',
    majorBuild: 26100,
    ubrRange: [863, 1742],
    editions: ['Pro', 'Home', 'Enterprise', 'Education'],
  },
  {
    osName: 'Windows 11',
    majorBuild: 22631,
    ubrRange: [2861, 4112],
    editions: ['Pro', 'Home', 'Enterprise'],
  },
  {
    osName: 'Windows 11',
    majorBuild: 22621,
    ubrRange: [1992, 3880],
    editions: ['Pro', 'Home'],
  },
  {
    osName: 'Windows 10',
    majorBuild: 19045,
    ubrRange: [3803, 4780],
    editions: ['Pro', 'Home', 'Enterprise'],
  },
  {
    osName: 'Windows 10',
    majorBuild: 19044,
    ubrRange: [2604, 3570],
    editions: ['Pro', 'Home'],
  },
]

const MACOS_MODELS = [
  { model: 'MacBook Air (M1, 2020)', versions: ['macOS 13.6.7', 'macOS 14.5', 'macOS 14.6'] },
  { model: 'MacBook Air 13\" (M2, 2022)', versions: ['macOS 14.4.1', 'macOS 14.5', 'macOS 15.0'] },
  { model: 'MacBook Air 15\" (M2, 2023)', versions: ['macOS 14.5', 'macOS 14.6', 'macOS 15.0'] },
  { model: 'MacBook Air 13\" (M3, 2024)', versions: ['macOS 14.5', 'macOS 14.6', 'macOS 15.1'] },
  { model: 'MacBook Pro 14\" (M1 Pro, 2021)', versions: ['macOS 13.6.6', 'macOS 14.5', 'macOS 14.6'] },
  { model: 'MacBook Pro 16\" (M1 Max, 2021)', versions: ['macOS 14.4.1', 'macOS 14.5'] },
  { model: 'MacBook Pro 14\" (M2 Pro, 2023)', versions: ['macOS 14.5', 'macOS 14.6'] },
  { model: 'MacBook Pro 16\" (M2 Max, 2023)', versions: ['macOS 14.5', 'macOS 15.0'] },
  { model: 'MacBook Pro 14\" (M3 Pro, 2023)', versions: ['macOS 14.5', 'macOS 14.6', 'macOS 15.1'] },
  { model: 'MacBook Pro 16\" (M3 Max, 2023)', versions: ['macOS 14.5', 'macOS 15.0'] },
  { model: 'Mac mini (M2, 2023)', versions: ['macOS 14.4.1', 'macOS 14.5', 'macOS 15.0'] },
  { model: 'Mac Studio (M2 Max, 2023)', versions: ['macOS 14.5', 'macOS 14.6'] },
  { model: 'iMac 24\" (M3, 2023)', versions: ['macOS 14.5', 'macOS 15.0'] },
]

const LINUX_DISTROS = [
  { distro: 'Ubuntu 24.04 LTS', kernel: 'Linux 6.8.0-31-generic x86_64' },
  { distro: 'Ubuntu 22.04.4 LTS', kernel: 'Linux 6.5.0-28-generic x86_64' },
  { distro: 'Ubuntu 22.04.3 LTS', kernel: 'Linux 5.15.0-94-generic x86_64' },
  { distro: 'Fedora Linux 40 (Workstation Edition)', kernel: 'Linux 6.8.9-300.fc40.x86_64' },
  { distro: 'Fedora Linux 39 (Workstation Edition)', kernel: 'Linux 6.6.14-200.fc39.x86_64' },
  { distro: 'Debian GNU/Linux 12 (bookworm)', kernel: 'Linux 6.1.0-18-amd64' },
  { distro: 'Arch Linux', kernel: 'Linux 6.8.9-arch1-1 x86_64' },
  { distro: 'Manjaro Linux', kernel: 'Linux 6.6.26-1-MANJARO x86_64' },
  { distro: 'Linux Mint 21.3 Virginia', kernel: 'Linux 5.15.0-91-generic x86_64' },
]

const SYSTEM_LANGUAGES = ['en-US', 'en-GB', 'en-CA', 'en-AU']
const APP_VERSIONS = ['5.2.2 x64', '5.3.1 x64', '5.4.0 x64', '5.4.1 x64', '5.5.0 x64', '5.5.2 x64']

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return Math.abs(hash)
}

export class DeviceProfileManager {
  public static getProfileForAccount(
    accountId: string,
    enabled: boolean = true
  ): DeviceProfile {
    if (!enabled) {
      return this.getNativeHostProfile()
    }

    const hostPlatform = os.platform()
    const seed = hashString(accountId || 'default_seed')

    if (hostPlatform === 'darwin') {
      return this.generateMacProfile(seed)
    } else if (hostPlatform === 'linux') {
      return this.generateLinuxProfile(seed)
    } else {
      return this.generateWindowsProfile(seed)
    }
  }

  private static generateWindowsProfile(seed: number): DeviceProfile {
    const allModels: { vendor: string; model: string }[] = []
    for (const spec of WINDOWS_SPECS) {
      for (const m of spec.models) {
        allModels.push({ vendor: spec.vendor, model: m })
      }
    }

    const modelEntry = allModels[seed % allModels.length]
    let deviceModel: string
    if (modelEntry.vendor === 'Desktop Custom' || modelEntry.vendor === 'Microsoft') {
      deviceModel = modelEntry.model
    } else {
      deviceModel = `${modelEntry.vendor} ${modelEntry.model}`
    }

    const build = WINDOWS_BUILDS[(seed >> 3) % WINDOWS_BUILDS.length]
    const edition = build.editions[(seed >> 5) % build.editions.length]
    const [minUbr, maxUbr] = build.ubrRange
    const ubr = minUbr + ((seed >> 2) % (maxUbr - minUbr + 1))

    const systemVersion = `${build.osName} ${edition} 64-bit (Build ${build.majorBuild}.${ubr})`
    const systemLangCode = SYSTEM_LANGUAGES[(seed >> 4) % SYSTEM_LANGUAGES.length]
    const appVersion = APP_VERSIONS[(seed >> 1) % APP_VERSIONS.length]

    return {
      deviceModel,
      systemVersion,
      appVersion,
      systemLangCode,
      langCode: 'en',
    }
  }

  private static generateMacProfile(seed: number): DeviceProfile {
    const entry = MACOS_MODELS[seed % MACOS_MODELS.length]
    const version = entry.versions[(seed >> 2) % entry.versions.length]
    const systemLangCode = SYSTEM_LANGUAGES[(seed >> 3) % SYSTEM_LANGUAGES.length]
    const appVersion = APP_VERSIONS[(seed >> 1) % APP_VERSIONS.length]

    return {
      deviceModel: entry.model,
      systemVersion: version,
      appVersion,
      systemLangCode,
      langCode: 'en',
    }
  }

  private static generateLinuxProfile(seed: number): DeviceProfile {
    const entry = LINUX_DISTROS[seed % LINUX_DISTROS.length]
    const systemLangCode = SYSTEM_LANGUAGES[(seed >> 3) % SYSTEM_LANGUAGES.length]
    const appVersion = APP_VERSIONS[(seed >> 1) % APP_VERSIONS.length]

    return {
      deviceModel: 'PC 64bit',
      systemVersion: `${entry.distro} (${entry.kernel})`,
      appVersion,
      systemLangCode,
      langCode: 'en',
    }
  }

  private static getNativeHostProfile(): DeviceProfile {
    const platform = os.platform()
    const release = os.release()
    let deviceModel = 'PC 64bit'
    let systemVersion = `${platform} ${release}`

    if (platform === 'win32') {
      deviceModel = 'Desktop x64'
      systemVersion = `Windows 10.0 (Build ${release})`
    } else if (platform === 'darwin') {
      deviceModel = 'Mac'
      systemVersion = `macOS ${release}`
    } else if (platform === 'linux') {
      deviceModel = 'PC 64bit'
      systemVersion = `Linux ${release}`
    }

    return {
      deviceModel,
      systemVersion,
      appVersion: '5.4.1 x64',
      systemLangCode: 'en-US',
      langCode: 'en',
    }
  }
}
