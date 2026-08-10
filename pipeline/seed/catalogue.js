/**
 * Catalogo dimostrativo.
 *
 * ATTENZIONE: questi non sono prezzi reali. Sono configurazioni plausibili,
 * scritte nello stile con cui i negozi italiani compilano i titoli, usate per
 * due scopi:
 *   1. avere un dataset con cui l'app funziona subito, anche senza credenziali
 *      o accesso di rete ai negozi;
 *   2. mettere sotto sforzo il motore di estrazione delle specifiche, che su
 *      queste stringhe deve produrre gli stessi campi che produrra' in
 *      produzione.
 *
 * Quando la raccolta reale porta a casa dei dati, questi record vengono
 * scartati (vedi `pipeline/run.js`).
 */

export const STORE_POOL = [
  { id: 'unieuro', name: 'Unieuro' },
  { id: 'mediaworld', name: 'MediaWorld' },
  { id: 'euronics', name: 'Euronics' },
  { id: 'monclick', name: 'Monclick' },
  { id: 'comet', name: 'Comet' },
  { id: 'drop', name: 'Drop (Next)' },
  { id: 'bpm-power', name: 'BPM Power' },
  { id: 'yeppon', name: 'Yeppon' },
];

/** [titolo, prezzo attuale, prezzo di riferimento] */
export const LAPTOPS = [
  ['Notebook Lenovo Legion Pro 5 16IRX9, Intel Core i7-14650HX, 32GB DDR5 5600MHz, 1TB SSD NVMe PCIe 4.0, NVIDIA GeForce RTX 4070 8GB GDDR6, 16" WQXGA 2560x1600 IPS 240Hz, Windows 11 Home, tastiera retroilluminata RGB, Wi-Fi 6E, Bluetooth 5.3, 2.5 Gb Ethernet, 80Wh, 2,5 kg', 1449, 2199],
  ['ASUS ROG Strix G16 G614JV, Core i7-13650HX 14 core fino a 4.9 GHz, 16GB DDR5, 512GB SSD M.2 NVMe, GeForce RTX 4060 8GB, 16 pollici Full HD+ 1920x1200 IPS 165Hz, Windows 11 Home, Wi-Fi 6, Bluetooth 5.2, 90Wh, 2,5 kg', 999, 1499],
  ['MSI Katana 15 B13VFK, Intel Core i7-13620H, 16 GB RAM DDR5 4800MHz, 1TB SSD NVMe, NVIDIA GeForce RTX 4060 8GB GDDR6, 15.6" FHD 144Hz IPS, Windows 11 Home, tastiera retroilluminata RGB, 53.5Wh, 2,25 kg', 849, 1299],
  ['Apple MacBook Air 13" M3, chip Apple M3 8 core, 16GB memoria unificata, 512GB SSD, display Liquid Retina 2560x1664, macOS, Wi-Fi 6E, Bluetooth 5.3, fino a 18 ore di autonomia, 1,24 kg', 1179, 1529],
  ['Apple MacBook Pro 14" M4 Pro, Apple M4 Pro 12 core, 24GB memoria unificata, 512GB SSD, Liquid Retina XDR 3024x1964 120Hz Mini LED, macOS, Thunderbolt 4, 72.4Wh, 1,55 kg', 2199, 2649],
  ['HP Victus 15-fa1015nl Gaming, Intel Core i5-13500H, 16GB DDR4 3200MHz, 512GB SSD NVMe, NVIDIA GeForce RTX 3050 6GB, 15,6" Full HD IPS 144Hz, Windows 11 Home, webcam HD 720p, Wi-Fi 6, 52.5Wh, 2,29 kg', 699, 999],
  ['Acer Nitro V 15 ANV15-51, Core i7-13620H, 16GB DDR5, 1TB SSD PCIe Gen 4, GeForce RTX 4050 6GB, 15.6 pollici FHD 1920x1080 IPS 144Hz, Windows 11 Home, tastiera retroilluminata RGB, 57Wh, 2,1 kg', 799, 1199],
  ['Lenovo IdeaPad Slim 5 16ABR8, AMD Ryzen 7 7730U 8 core, 16GB LPDDR5, 512GB SSD NVMe, AMD Radeon Graphics integrata, 16" WUXGA 1920x1200 IPS 300 nits, Windows 11 Home, lettore di impronte digitali, Wi-Fi 6, 71Wh, 1,79 kg', 599, 899],
  ['ASUS Zenbook 14 OLED UX3405MA, Intel Core Ultra 7 155H, 16GB LPDDR5X, 1TB SSD, Intel Arc Graphics, 14" 3K 2880x1800 OLED 120Hz 400 nits, Windows 11 Home, Thunderbolt 4, Wi-Fi 6E, 75Wh, fino a 15 ore, 1,2 kg', 1049, 1499],
  ['Dell XPS 13 9340, Core Ultra 7 155H, 16GB LPDDR5X saldata, 512GB SSD NVMe, Intel Arc Graphics, 13.4" FHD+ 1920x1200 touchscreen, Windows 11 Pro, 2x USB-C Thunderbolt 4, Wi-Fi 7, Bluetooth 5.4, 55Wh, 1,17 kg', 1199, 1699],
  ['HP Pavilion Plus 14-eh1006nl, Intel Core i7-1355U, 16GB DDR4, 1TB SSD NVMe, Intel Iris Xe Graphics, 14" 2.2K 2240x1400 IPS, Windows 11 Home, tastiera retroilluminata, webcam 1080p, Wi-Fi 6E, 68Wh, 1,4 kg', 749, 1099],
  ['MSI Raider GE78 HX 14VIG, Intel Core i9-14900HX 24 core, 32GB DDR5 5600, 2TB SSD NVMe PCIe 4.0, NVIDIA GeForce RTX 4090 16GB GDDR6, 17" QHD+ 2560x1600 240Hz IPS, Windows 11 Pro, raffreddamento a liquido, 99.9Wh, 3,1 kg', 2999, 4299],
  ['Acer Swift Go 14 SFG14-72, Intel Core Ultra 5 125H, 16GB LPDDR5X, 512GB SSD, Intel Arc Graphics, 14" 2.8K 2880x1800 OLED 90Hz, Windows 11 Home, lettore di impronte, Wi-Fi 6E, Bluetooth 5.3, 65Wh, 1,32 kg', 799, 1199],
  ['Lenovo ThinkPad E14 Gen 6, AMD Ryzen 5 7535HS, 16GB DDR5 5600MHz, 512GB SSD NVMe, Radeon 660M integrata, 14" WUXGA 1920x1200 IPS, Windows 11 Pro, tastiera retroilluminata, fingerprint, Wi-Fi 6E, 57Wh, 1,41 kg', 679, 949],
  ['ASUS TUF Gaming A15 FA507NU, AMD Ryzen 7 7735HS 8 core 16 thread, 16GB DDR5 4800MHz, 512GB SSD M.2 NVMe, NVIDIA GeForce RTX 4050 6GB GDDR6, 15,6" FHD 144Hz IPS, Windows 11 Home, 90Wh, 2,2 kg', 749, 1099],
  ['HP OMEN 16-wf0004nl, Intel Core i7-13700HX, 32GB DDR5, 1TB SSD NVMe, NVIDIA GeForce RTX 4070 8GB, 16.1" QHD 2560x1440 IPS 240Hz, Windows 11 Home, tastiera retroilluminata RGB, Wi-Fi 6E, 83Wh, 2,3 kg', 1349, 1999],
  ['Samsung Galaxy Book4 Pro 14, Intel Core Ultra 7 155H, 16GB LPDDR5X, 512GB SSD NVMe, Intel Arc Graphics, 14" 3K 2880x1800 AMOLED 120Hz touch, Windows 11 Home, Thunderbolt 4, Wi-Fi 6E, 63Wh, 1,23 kg', 1149, 1799],
  ['Acer Aspire 3 A315-24P, AMD Ryzen 3 7320U, 8GB LPDDR5, 256GB SSD NVMe, AMD Radeon 610M, 15.6" Full HD 1920x1080, Windows 11 Home in S mode, Wi-Fi 6, Bluetooth 5.1, 50Wh, 1,78 kg', 329, 499],
  ['Lenovo LOQ 15IRX9, Intel Core i7-13650HX, 16GB DDR5 5200MHz, 512GB SSD NVMe, NVIDIA GeForce RTX 4060 8GB GDDR6, 15.6" FHD 1920x1080 IPS 144Hz 350 nits, Windows 11 Home, Wi-Fi 6, 60Wh, 2,4 kg', 899, 1349],
  ['MSI Prestige 13 AI Evo A1M, Intel Core Ultra 7 155H, 32GB LPDDR5, 1TB SSD NVMe, Intel Arc Graphics, 13.3" FHD+ 1920x1200 OLED, Windows 11 Pro, 2x USB-C Thunderbolt 4, Wi-Fi 7, 75Wh, fino a 20 ore, 0,99 kg', 1299, 1799],
  ['ASUS Vivobook 15 X1504VA, Intel Core i5-1335U 10 core, 16GB DDR4 3200MHz, 512GB SSD M.2 NVMe, Intel Iris Xe Graphics, 15.6" Full HD 1920x1080, Windows 11 Home, webcam HD, Wi-Fi 6, 42Wh, 1,7 kg', 449, 699],
  ['Dell Inspiron 16 Plus 7640, Intel Core Ultra 7 155H, 16GB DDR5 5600, 1TB SSD NVMe, NVIDIA GeForce RTX 4050 6GB, 16" 2.5K 2560x1600 IPS 120Hz, Windows 11 Home, tastiera retroilluminata, Wi-Fi 6E, 64Wh, 2,05 kg', 999, 1449],
  ['HP EliteBook 840 G11, Intel Core Ultra 5 125U, 16GB DDR5, 512GB SSD NVMe, Intel Graphics, 14" WUXGA 1920x1200 IPS 400 nits, Windows 11 Pro, lettore di impronte digitali, webcam 1080p, Wi-Fi 6E, 56Wh, 1,36 kg', 1099, 1599],
  ['Acer Predator Helios Neo 16 PHN16-72, Intel Core i9-14900HX, 32GB DDR5 5600MHz, 1TB SSD NVMe PCIe Gen 4, NVIDIA GeForce RTX 4070 8GB, 16" WQXGA 2560x1600 IPS 240Hz, Windows 11 Home, tastiera RGB, 90Wh, 2,8 kg', 1599, 2299],
  ['Lenovo Yoga 7 2-in-1 14AHP9, AMD Ryzen 7 8840HS, 16GB LPDDR5X, 1TB SSD NVMe, Radeon 780M, 14" WUXGA 1920x1200 OLED touchscreen 60Hz, Windows 11 Home, Wi-Fi 6E, Bluetooth 5.3, 71Wh, 1,49 kg', 899, 1299],
  ['ASUS Chromebook Plus CX34, Intel Core i3-1215U, 8GB LPDDR5, 256GB SSD, Intel UHD Graphics, 14" Full HD 1920x1080 IPS, ChromeOS, Wi-Fi 6E, 50Wh, fino a 10 ore, 1,44 kg', 349, 549],
  ['MSI Cyborg 15 A13VF, Intel Core i7-13620H, 16GB DDR5 5200MHz, 512GB SSD NVMe, NVIDIA GeForce RTX 4060 8GB, 15.6" FHD 1920x1080 IPS 144Hz, Windows 11 Home, tastiera retroilluminata, Wi-Fi 6, 53.5Wh, 1,98 kg', 899, 1299],
  ['Apple MacBook Air 15" M4, Apple M4 10 core, 16GB memoria unificata, 256GB SSD, Liquid Retina 2880x1864, macOS, Wi-Fi 6E, Bluetooth 5.3, fino a 18 ore di autonomia, 1,51 kg', 1349, 1629],
  ['Huawei MateBook D16 2024, Intel Core i9-13900H, 16GB DDR5, 1TB SSD NVMe, Intel Iris Xe Graphics, 16" 1920x1200 IPS 300 nits, Windows 11 Home, lettore di impronte, Wi-Fi 6, 70Wh, 1,68 kg', 899, 1299],
  ['Microsoft Surface Laptop 7 13.8", Snapdragon X Elite, 16GB LPDDR5X, 512GB SSD, Qualcomm Adreno, 13.8" 2304x1536 touchscreen 120Hz, Windows 11 Home, Wi-Fi 7, Bluetooth 5.4, 54Wh, 1,34 kg', 1099, 1549],
  ['Lenovo IdeaPad 1 15AMN7, AMD Ryzen 5 7520U, 8GB LPDDR5, 512GB SSD NVMe, AMD Radeon 610M, 15.6" Full HD 1920x1080 TN, Windows 11 Home, Wi-Fi 6, Bluetooth 5.1, 42Wh, 1,6 kg', 379, 549],
  ['Gigabyte AORUS 16X ASG, Intel Core i7-14650HX, 16GB DDR5 5600MHz, 1TB SSD NVMe Gen4, NVIDIA GeForce RTX 4070 8GB GDDR6, 16" WQXGA 2560x1600 IPS 165Hz, Windows 11 Home, tastiera RGB per tasto, 99Wh, 2,3 kg', 1399, 1899],
  ['Razer Blade 14 2024, AMD Ryzen 9 8945HS, 32GB LPDDR5X saldata, 1TB SSD NVMe, NVIDIA GeForce RTX 4070 8GB, 14" QHD+ 2560x1600 IPS 240Hz, Windows 11 Home, Thunderbolt 4, Wi-Fi 6E, 68.1Wh, 1,84 kg', 1899, 2699],
  ['Acer Aspire Go 15 AG15-31P, Intel N100, 8GB LPDDR5, 256GB SSD NVMe, Intel UHD Graphics, 15.6" Full HD 1920x1080 IPS, Windows 11 Home, Wi-Fi 6, Bluetooth 5.1, 50Wh, 1,75 kg', 279, 429],
  ['ASUS ProArt P16 H7606WI, AMD Ryzen AI 9 HX 370, 32GB LPDDR5X, 1TB SSD NVMe, NVIDIA GeForce RTX 4070 8GB, 16" 4K UHD 3840x2160 OLED 60Hz touchscreen 500 nits, Windows 11 Pro, Wi-Fi 7, 90Wh, 1,85 kg', 2199, 2999],
  ['HP 255 G10, AMD Ryzen 5 7530U 6 core 12 thread, 16GB DDR4 3200MHz, 512GB SSD NVMe, AMD Radeon Graphics, 15.6" Full HD 1920x1080 IPS, Windows 11 Pro, Wi-Fi 6, Bluetooth 5.3, 41Wh, 1,47 kg', 469, 699],
  ['Lenovo Legion Slim 5 16APH8, AMD Ryzen 7 7840HS, 16GB DDR5 5600, 512GB SSD NVMe PCIe 4.0, NVIDIA GeForce RTX 4060 8GB, 16" WQXGA 2560x1600 IPS 165Hz 350 nits, Windows 11 Home, tastiera retroilluminata, 80Wh, 2,3 kg', 1099, 1599],
  ['Dell Alienware m16 R2, Intel Core Ultra 7 155H, 32GB DDR5 5600MHz, 1TB SSD NVMe, NVIDIA GeForce RTX 4070 8GB GDDR6, 16" QHD+ 2560x1600 IPS 240Hz, Windows 11 Home, tastiera RGB, Wi-Fi 7, 90Wh, 2,67 kg', 1799, 2499],
  ['Samsung Galaxy Book4 15, Intel Core i5-120U, 16GB DDR4, 512GB SSD NVMe, Intel Graphics, 15.6" Full HD 1920x1080 IPS, Windows 11 Home, Wi-Fi 6E, Bluetooth 5.3, 54Wh, 1,55 kg', 649, 949],
  ['MSI Stealth 16 AI Studio A1V, Intel Core Ultra 9 185H, 32GB LPDDR5X, 2TB SSD NVMe, NVIDIA GeForce RTX 4070 8GB, 16" UHD+ 3840x2400 OLED 120Hz, Windows 11 Pro, Thunderbolt 4, Wi-Fi 7, 99.9Wh, 1,88 kg', 2299, 3199],
];

export const DESKTOPS = [
  ['PC Desktop Gaming Assemblato, AMD Ryzen 7 7800X3D 8 core fino a 5.0 GHz, scheda madre MSI B650 Gaming Plus WiFi, 32GB DDR5 6000MHz, 1TB SSD NVMe PCIe 4.0, NVIDIA GeForce RTX 4070 Ti Super 16GB GDDR6X, alimentatore 850W 80+ Gold, case Mid Tower, dissipatore a liquido 240mm, Windows 11 Home, Wi-Fi 6E, 2.5 Gb Ethernet', 1899, 2599],
  ['HP OMEN 45L GT22-2005nl, Intel Core i9-14900K 24 core, scheda madre Z790, 32GB DDR5 5600MHz, 2TB SSD NVMe, NVIDIA GeForce RTX 4080 Super 16GB, alimentatore 800W 80+ Gold, raffreddamento a liquido, case Full Tower, Windows 11 Home, Wi-Fi 6E', 2799, 3699],
  ['PC Fisso Gaming, AMD Ryzen 5 7600 6 core, scheda madre B650 Micro-ATX socket AM5, 16GB DDR5 5600MHz, 1TB SSD M.2 NVMe Gen4, NVIDIA GeForce RTX 4060 8GB, alimentatore 650W 80+ Bronze, case Mid Tower, Windows 11 Home, Wi-Fi 6', 899, 1299],
  ['Lenovo LOQ Tower 17IRR9, Intel Core i5-14400F, chipset B760, 16GB DDR5 4400MHz, 512GB SSD NVMe, NVIDIA GeForce RTX 4060 8GB GDDR6, alimentatore 500W, case Mid Tower, Windows 11 Home, Wi-Fi 6, Gigabit Ethernet', 849, 1199],
  ['MSI MAG Infinite S3 14NUE7, Intel Core i7-14700F, scheda madre B760, 32GB DDR5 5600, 1TB SSD NVMe, NVIDIA GeForce RTX 4070 Super 12GB, alimentatore 650W 80+ Bronze, case Mid Tower, Windows 11 Home, Wi-Fi 6E', 1499, 2099],
  ['Apple Mac mini M4, chip Apple M4 10 core, 16GB memoria unificata, 512GB SSD, macOS, Thunderbolt 4, Wi-Fi 6E, Bluetooth 5.3, Gigabit Ethernet, mini pc', 899, 1129],
  ['ASUS ROG Strix G16CH, Intel Core i7-13700F, chipset B760, 32GB DDR5 4800MHz, 1TB SSD NVMe PCIe 4.0, NVIDIA GeForce RTX 4070 12GB GDDR6X, alimentatore 750W 80+ Gold, case Mid Tower, Windows 11 Home, Wi-Fi 6', 1599, 2199],
  ['PC Desktop Ufficio, Intel Core i5-12400 6 core, scheda madre H610 Micro-ATX, 16GB DDR4 3200MHz, 512GB SSD NVMe, Intel UHD Graphics 730, alimentatore 400W, case Mini Tower, Windows 11 Pro, Gigabit Ethernet', 499, 749],
  ['HP Pavilion Desktop TP01-3007nl, Intel Core i7-12700, chipset B660, 16GB DDR4, 1TB SSD NVMe, Intel UHD Graphics 770, alimentatore 310W, case Mini Tower, Windows 11 Home, Wi-Fi 6, Bluetooth 5.2', 749, 1049],
  ['Beelink SER8 Mini PC, AMD Ryzen 7 8845HS 8 core 16 thread, 32GB DDR5 5600MHz, 1TB SSD NVMe PCIe 4.0, Radeon 780M integrata, Windows 11 Pro, Wi-Fi 6, Bluetooth 5.2, 2.5 Gb Ethernet, mini pc', 649, 899],
  ['PC Gaming Assemblato Top, Intel Core i9-14900KF, scheda madre ASUS ROG STRIX Z790-A ATX, 64GB DDR5 6400MHz, 2TB SSD NVMe Gen4 + 2TB HDD, NVIDIA GeForce RTX 4090 24GB GDDR6X, alimentatore 1000W 80+ Platinum, raffreddamento a liquido 360mm, case Full Tower, Windows 11 Pro, Wi-Fi 7', 4299, 5499],
  ['Lenovo IdeaCentre AIO 27ARR9 All-in-One, AMD Ryzen 7 8745HS, 16GB DDR5, 1TB SSD NVMe, Radeon 780M, 27" QHD 2560x1440 IPS touchscreen, Windows 11 Home, webcam 1080p, Wi-Fi 6E, Bluetooth 5.3', 1099, 1499],
  ['Acer Aspire TC-1785, Intel Core i5-14400, chipset B760, 16GB DDR5 4800MHz, 1TB SSD NVMe, Intel UHD Graphics 730, alimentatore 300W, case Mini Tower, Windows 11 Home, Wi-Fi 6, Gigabit Ethernet', 649, 899],
  ['PC Fisso Gaming AMD, Ryzen 5 5600 6 core 12 thread, scheda madre B550 Micro-ATX socket AM4, 16GB DDR4 3600MHz, 1TB SSD NVMe, AMD Radeon RX 7600 8GB, alimentatore 600W 80+ Bronze, case Mid Tower, Windows 11 Home', 749, 1099],
  ['Apple iMac 24" M4 All-in-One, Apple M4 10 core, 16GB memoria unificata, 512GB SSD, display Retina 4K 4480x2520, macOS, Wi-Fi 6E, Bluetooth 5.3, webcam 1080p', 1749, 2069],
  ['MSI Codex R2 14NUE7, Intel Core i5-14400F, scheda madre B760, 16GB DDR5 5600MHz, 1TB SSD NVMe, NVIDIA GeForce RTX 4060 Ti 8GB, alimentatore 550W 80+ Bronze, case Mid Tower, Windows 11 Home, Wi-Fi 6', 1049, 1449],
  ['HP Elite Mini 800 G9, Intel Core i7-13700T, 32GB DDR5, 1TB SSD NVMe, Intel UHD Graphics 770, Windows 11 Pro, Wi-Fi 6E, Bluetooth 5.3, Gigabit Ethernet, mini pc', 999, 1399],
  ['PC Workstation, Intel Core i9-14900K, scheda madre W680 ATX, 128GB DDR5 5600MHz ECC, 4TB SSD NVMe PCIe 4.0, NVIDIA RTX A4000 16GB, alimentatore 1000W 80+ Platinum, case Full Tower, Windows 11 Pro, 10 Gb Ethernet', 4999, 6299],
  ['Dell OptiPlex 7020 SFF, Intel Core i5-14500, chipset Q670, 16GB DDR5 4400MHz, 512GB SSD NVMe, Intel UHD Graphics 770, alimentatore 260W, small form factor, Windows 11 Pro, Gigabit Ethernet', 799, 1099],
  ['PC Gaming AMD Ryzen 9, Ryzen 9 7900X 12 core 24 thread fino a 5.6 GHz, scheda madre X670E ATX socket AM5, 32GB DDR5 6000MHz, 2TB SSD NVMe Gen4, AMD Radeon RX 7900 XT 20GB, alimentatore 850W 80+ Gold, dissipatore a liquido 280mm, case Mid Tower, Windows 11 Home, Wi-Fi 6E', 2299, 3099],
  ['Acer Predator Orion 3000 PO3-655, Intel Core i7-14700F, chipset B760, 32GB DDR5 5600MHz, 1TB SSD NVMe, NVIDIA GeForce RTX 4070 Super 12GB, alimentatore 750W 80+ Gold, case Mid Tower, Windows 11 Home, Wi-Fi 6E', 1699, 2299],
  ['Minisforum UM790 Pro Mini PC, AMD Ryzen 9 7940HS 8 core, 32GB DDR5 5600MHz, 1TB SSD NVMe PCIe 4.0, Radeon 780M, Windows 11 Pro, Wi-Fi 6E, Bluetooth 5.3, 2.5 Gb Ethernet, mini pc', 699, 999],
  ['PC Fisso Entry, Intel N100, scheda madre Mini-ITX, 16GB DDR4 3200MHz, 512GB SSD NVMe, Intel UHD Graphics, alimentatore 120W, mini pc, Windows 11 Pro, Wi-Fi 6, Gigabit Ethernet', 249, 379],
  ['Lenovo ThinkCentre M75q Gen 5 Tiny, AMD Ryzen 5 8500G, 16GB DDR5 5600MHz, 512GB SSD NVMe, Radeon 740M, Windows 11 Pro, Wi-Fi 6E, Bluetooth 5.3, Gigabit Ethernet, mini pc', 599, 849],
  ['PC Gaming Assemblato Intel, Core i5-14600KF 14 core, scheda madre B760 ATX, 32GB DDR5 6000MHz, 1TB SSD NVMe Gen4, NVIDIA GeForce RTX 4070 Ti 12GB, alimentatore 750W 80+ Gold, dissipatore ad aria, case Mid Tower, Windows 11 Home, Wi-Fi 6', 1699, 2299],
  ['HP Victus 15L TG02-2004nl, Intel Core i5-13400F, chipset B660, 16GB DDR4 3200MHz, 512GB SSD NVMe, NVIDIA GeForce RTX 3050 8GB, alimentatore 500W, case Mid Tower, Windows 11 Home, Wi-Fi 6', 699, 999],
  ['ASUS ExpertCenter D700MD, Intel Core i7-13700, chipset B760 Micro-ATX, 16GB DDR4 3200MHz, 1TB SSD NVMe, Intel UHD Graphics 770, alimentatore 300W, case Mini Tower, Windows 11 Pro, Gigabit Ethernet', 899, 1249],
  ['PC Desktop Creator, AMD Ryzen 9 7950X 16 core 32 thread, scheda madre X670 ATX, 64GB DDR5 5600MHz, 2TB SSD NVMe PCIe 4.0, NVIDIA GeForce RTX 4080 Super 16GB, alimentatore 1000W 80+ Gold, raffreddamento a liquido 360mm, case Full Tower, Windows 11 Pro', 3299, 4399],
  ['MSI Cubi N ADL Mini PC, Intel N200, 8GB DDR4 3200MHz, 256GB SSD NVMe, Intel UHD Graphics, Windows 11 Pro, Wi-Fi 6, Bluetooth 5.2, Gigabit Ethernet, mini pc', 299, 449],
  ['PC Gaming Budget, AMD Ryzen 5 8400F, scheda madre A620 Micro-ATX socket AM5, 16GB DDR5 5200MHz, 512GB SSD NVMe, NVIDIA GeForce RTX 4060 8GB, alimentatore 550W 80+ Bronze, case Mid Tower, Windows 11 Home', 799, 1149],
  ['Apple Mac Studio M2 Max, Apple M2 Max 12 core, 32GB memoria unificata, 512GB SSD, macOS, Thunderbolt 4, Wi-Fi 6E, Bluetooth 5.3, 10 Gb Ethernet, mini pc', 2299, 2699],
  ['Gigabyte AORUS Model X, Intel Core i7-14700KF, scheda madre Z790 ATX, 32GB DDR5 6000MHz, 2TB SSD NVMe Gen4, NVIDIA GeForce RTX 4080 Super 16GB, alimentatore 850W 80+ Platinum, raffreddamento a liquido 360mm, case Mid Tower, Windows 11 Home, Wi-Fi 7', 2999, 3899],
  ['PC Fisso Multimediale, Intel Core i3-14100, scheda madre H610 Micro-ATX, 16GB DDR4 3200MHz, 512GB SSD NVMe + 1TB HDD, Intel UHD Graphics 730, alimentatore 400W, case Mini Tower, Windows 11 Home, Wi-Fi 6', 429, 629],
  ['Zotac ZBOX Magnus EN374070C, Intel Core i7-13700HX, 32GB DDR5, 1TB SSD NVMe, NVIDIA GeForce RTX 4070 8GB, Windows 11 Pro, Wi-Fi 6E, Bluetooth 5.2, 2.5 Gb Ethernet, mini pc', 1799, 2299],
  ['HP All-in-One 27-cr0010nl, Intel Core i7-1355U, 16GB DDR4 3200MHz, 1TB SSD NVMe, Intel Iris Xe Graphics, 27" Full HD 1920x1080 IPS touchscreen, Windows 11 Home, webcam 1080p, Wi-Fi 6, Bluetooth 5.3', 999, 1399],
  ['PC Gaming Ryzen 7 con RTX 5070, AMD Ryzen 7 9800X3D 8 core, scheda madre B850 ATX socket AM5, 32GB DDR5 6000MHz, 2TB SSD NVMe Gen5, NVIDIA GeForce RTX 5070 Ti 16GB GDDR7, alimentatore 850W 80+ Gold, dissipatore a liquido 360mm, case Mid Tower, Windows 11 Home, Wi-Fi 7', 2499, 3299],
];
