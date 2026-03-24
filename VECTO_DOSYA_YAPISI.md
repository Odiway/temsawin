# VECTO Dosya Yapısı

> EU 2017/2400 | VECTO 5.0.x | Schema 2.0 | NS: `urn:tugraz:ivt:VectoAPI:DeclarationInput:v3.0`

---

## 1. INPUT DOSYASI (.xml)

Simülasyon giriş dosyası. Dosya adı = VECTO variant kodu (ör: `HD2C00D101103101306306000.xml`).

### 1.1 Vehicle (18 Alan)

| Alan | Tip | Birim | Örnek |
|------|-----|-------|-------|
| `Manufacturer` | str | — | TEMSA SKODA SABANCI... |
| `ManufacturerAddress` | str | — | Sarıhamzalı Mah., Adana |
| `Model` | str | — | HD12.2 |
| `VIN` | str | — | 17 karakter şasi no |
| `Date` | dateTime | — | 2025-10-23T19:07:00Z |
| `SimulationToolLicenseNumber` | str | — | e6*2017/2400*...*LICENCE*00016*00 |
| `LegislativeCategory` | enum | — | M3 |
| `ChassisConfiguration` | enum | — | Bus |
| `AxleConfiguration` | enum | — | 4x2 |
| `Articulated` | bool | — | false |
| `TechnicalPermissibleMaximumLadenMass` | int | kg | 19000 |
| `IdlingSpeed` | int | rpm | 550 |
| `RetarderType` | str | — | Losses included in Gearbox |
| `RetarderRatio` | dec | — | 1.000 |
| `AngledriveType` | enum | — | None |
| `ZeroEmissionVehicle` | bool | — | false |
| `ADAS` | — | — | EngineStopStart, EcoRoll×2, PredictiveCruiseControl (none/1-2-3) |
| `Components` | — | — | 7 bileşen (aşağıda) |

### 1.2 Components (7 Bileşen)

Her bileşen `Data` + `Signature` (SHA256 dijital imza) içerir.

#### Engine (Motor) — 19 alan + 2 harita

**Temel:** Manufacturer, Model, CertificationNumber, Date, AppVersion, Displacement (ccm), IdlingSpeed (rpm), RatedSpeed (rpm), RatedPower (W), MaxEngineTorque (Nm), WHTCUrban/Rural/Motorway, BFColdHot, CFRegPer, CFNCV, FuelType

**FuelConsumptionMap** (~176 Entry):
`<Entry engineSpeed="rpm" torque="Nm" fuelConsumption="g/h" />`
→ 13 devir × 14 tork noktası

**FullLoadAndDragCurve** (~193 Entry):
`<Entry engineSpeed="rpm" maxTorque="Nm" dragTorque="Nm" />`
→ 542–2166 rpm, 8 rpm aralık

#### Gearbox (Şanzıman) — 8 alan + vites haritaları

**Temel:** Manufacturer, Model, CertificationNumber, Date, AppVersion, TransmissionType (APT-S/AMT/MT), MainCertificationMethod (Opt 1/2/3)

**Her Gear:** `number`, `Ratio`, `MaxTorque` (Nm), `MaxSpeed` (rpm)
+ **TorqueLossMap** (~85-100 Entry/vites): `inputSpeed (rpm)`, `inputTorque (Nm)`, `torqueLoss (Nm)`
→ 6 vites = ~510-600 Entry toplam

#### TorqueConverter — 7 alan + karakteristik

**Temel:** Manufacturer, Model, CertificationNumber, Date, AppVersion, CertificationMethod (Measured/Standard)

**Characteristics** (14 Entry): `speedRatio (0.0–0.95)`, `torqueRatio`, `inputTorqueRef (Nm)`

#### Retarder — 7 alan + kayıp haritası

**Temel:** Manufacturer, Model, CertificationNumber, Date, AppVersion, CertificationMethod

**RetarderLossMap** (17 Entry): `retarderSpeed (rpm)`, `torqueLoss (Nm)` → 0–6100 rpm

#### Axlegear — 9 alan + kayıp haritası

**Temel:** Manufacturer, Model, CertificationNumber, Date, AppVersion, LineType (Single reduction axle), Ratio, CertificationMethod

**TorqueLossMap** (~442 Entry): `inputSpeed (rpm)`, `inputTorque (Nm)`, `torqueLoss (Nm)` → 12 devir × ~37 tork

#### AxleWheels — Aks başına lastik bilgisi

Her Axle: `axleNumber`, `AxleType` (Driven/NonDriven), `TwinTyres`, `Steered`
Tyre/Data: `Manufacturer`, `Model`, `CertificationNumber`, `Date`, `Dimension` (295/80 R22.5), `RRCDeclared` (0.0060), `FzISO` (31270 N)

#### Auxiliaries — 5 alt sistem

| Alt Sistem | Alanlar |
|-----------|---------|
| **Fan** | Technology (Belt driven - On/off clutch) |
| **SteeringPump** | Technology per axle (Fixed displacement) |
| **ElectricSystem** | AlternatorTechnology, SmartAlternator (Current/Voltage), Battery (Technology/Capacity/Voltage) |
| **PneumaticSystem** | SizeOfAirSupply, CompressorDrive, Clutch, CompressorRatio, SmartCompression, SmartRegeneration, AirsuspensionControl, SCRReagentDosing |
| **HVAC** | AdjustableCoolantThermostat, EngineWasteGasHeatExchanger |

---

## 2. RSLT_MANUFACTURER (.RSLT_MANUFACTURER.xml)

Üretici sonuç dosyası. Kök: `VectoOutput`

### 2.1 Vehicle (25 Alan)

| Alan | Birim | Örnek |
|------|-------|-------|
| Manufacturers/Step[1-2] (Manufacturer + Address) | — | Multi-step üretici |
| Model | — | HD13 |
| VIN | — | NLTRHUK8701001311 |
| VehicleTypeApprovalNumber | — | e5*2007/46*1191*19 |
| VehicleCategory | — | M3 |
| AxleConfiguration | — | 4x2 |
| TechnicalPermissibleMaximumLadenMass | kg | 21740 |
| VehicleGroup / VehicleGroupCO2 | — | 32d / N/A |
| CorrectedActualMass | kg | 13910 |
| ZeroEmissionVehicle / HybridElectricHDV | — | false / false |
| ClassBus | — | III |
| NumberPassengers (Upper/Lower Deck) | — | 0 / 63 |
| BodyworkCode | — | CA |
| LowEntry | — | false |
| HeightIntegratedBody / VehicleLength / VehicleWidth | mm | 3264 / 13076 / 2550 |
| DoorDriveTechnology / TankSystem | — | pneumatic / Unknown |
| ADAS | — | ESS, EcoRoll×2, PCC (tümü false) |

**Components (özet):**
- AirDrag: CertificationMethod + CdxA (m²)
- ElectricSystem: 5× LED durumu (DayRunning/Head/Position/Brake/Interior)
- HVACSystem: Config no, HeatPump (Driver/Passenger × Cooling/Heating), DoubleGlazing, AdjustableHeater, SeparateDucts, HeaterPower (kW)

### 2.2 Results — 4 Misyon

2× Interurban + 2× Coach (düşük/yüksek yükleme)

**Her misyon:**

| Bölüm | İçerik |
|-------|--------|
| **Mission** | Interurban / Coach |
| **Distance** | km |
| **SimulationParameters** | TotalVehicleMass (kg), Payload (kg), PassengerCount |
| **PrimaryVehicleSubgroup** | Ör: P32SD |
| **VehiclePerformance** (11) | AverageSpeed, AverageDrivingSpeed, Min/MaxSpeed (km/h), MaxDecel/Accel (m/s²), FullLoadDriving%, GearshiftCount, EngineSpeed Min/Avg/Max (rpm), AvgGearbox/AxlegearEfficiency (%) |
| **Fuel** (6 birim) | g/km, g/p-km, MJ/km, MJ/p-km, l/100km, l/p-km |
| **CO₂** (2 birim) | g/km, g/p-km |

**ApplicationInformation:** SimulationToolVersion + Date

**Signature:** SHA256 dijital imza (canonicalization + exc-c14n)

---

## 3. RSLT_MANUFACTURER_PRIMARY (.RSLT_MANUFACTURER_PRIMARY.xml)

Birincil araç sonuçları. RSLT_MANUFACTURER'dan farkları:

| Fark | MANUFACTURER | PRIMARY |
|------|-------------|---------|
| Vehicle alanları | 25 | 15 |
| Manufacturers | Multi-step | Tek |
| TypeApproval/ClassBus/Passengers/Bodywork/LowEntry/Height/Length/Width/Door/Tank | Var | **Yok** |
| Components | AirDrag + LED + HVAC | **Engine + Transmission + Retarder + Axlegear + AxleWheels + Aux** (detaylı) |
| PrimaryVehicleSubgroup | Var | **Yok** |

**PRIMARY Components detayı:**
- Engine: Model, CertNo, DigestValue, RatedPower, IdlingSpeed, RatedSpeed, Capacity, FuelType, WHR
- Transmission: Model, CertNo, CertMethod, DigestValue, Type, GearRatios, TorqueConverterModel
- Retarder: CertMethod, CertNo
- Axlegear: Ratio, CertMethod, CertNo
- AxleWheels: Dimension, SpecificRRC, CertNo (aks başına)
- Auxiliaries: Fan/SteeringPump/ElectricSystem/PneumaticSystem teknolojileri

---

## 4. RSLT_CUSTOMER (.RSLT_CUSTOMER.xml)

Müşteri bilgi dosyası. Kök: `VectoCustomerInformation`

### Vehicle (33 Alan)

RSLT_MANUFACTURER (25) + ek alanlar:
TotalPropulsionPower (kW), VehicleGroupCO2, WasteHeatRecovery, DualFuelVehicle, TotalNumberOfPassengers, EngineRatedPower (kW), EngineCapacity (ltr), FuelType, TransmissionValues/Type, NrOfGears, Retarder (bool), AxleRatio, AverageRRC, Axle×N (Dimension/FuelEffClass/CertNo), SteeringPump, AlternatorTech, SmartCompression/Regeneration, HVAC (Config/HeaterPower/DoubleGlazing)

### Dijital İmzalar (4 adet)

InputDataSignaturePrimaryVehicle, ManufacturerRecordSignaturePrimaryVehicle, InputDataSignature, ManufacturerRecordSignature — her biri SHA256 hash

### Results

4 misyon (VehiclePerformance **yok**, Distance **yok**, PrimaryVehicleSubgroup **yok**)
+ **Summary:** Vocational, AveragePassengerCount, Fuel×6, CO₂ (g/km + g/p-km) — ağırlıklı ortalama

---

## 5. VSUM DOSYASI (.vsum)

CSV formatı, 200+ kolon. Yapı: `# VECTO versiyon - tarih` → header → misyon satırları → `#@ SHA256: hash`

### Kolon Grupları

| Grup | ~Kolon | İçerik |
|------|--------|--------|
| **İş Tanımlama** | 4 | Job, InputFile, Cycle (Interurban.vdri/Coach.vdri), Status |
| **Araç** | 8 | Manufacturer, VIN, Model, CO₂ class, CurbMass, Loading, PassengerCount, TotalMass (kg) |
| **Motor** | 14 | Manufacturer, Model, FuelType, RatedPower (kW), IdlingSpeed, RatedSpeed, Displacement (ccm), WHTCUrban/Rural/Motorway, BFColdHot, CFRegPer, actualCF, VehicleFuelType |
| **Aerodinamik & Lastik** | 15 | CdxA (m²), RRC×4 aks, FzISO×4 aks, totalRRC, weightedRRC, r_dyn (m), aks sayıları |
| **Şanzıman** | 15 | Manufacturer, Model, Type, Gear 1-12 Ratio |
| **TC/Ret/Angle/Axle** | 12 | TorqueConverter, Retarder, Angledrive, Axlegear (üretici/model/oran/tip) |
| **Yardımcı & Kontrol** | 8 | STP, FAN, AC, PS, ES teknolojileri, ShiftStrategy, ADAS |
| **Yakıt Tüketimi** | 30 | FC-Map → FC-NCVc → FC-WHTCc → FC-ESS → FC-BusAux_PS/ES_Corr → FC-WHR_Corr → FC-SoC → FC-AuxHeater → **FC-Final** (g/h, g/km, l/100km, l/100tkm, l/100Pkm) |
| **CO₂** | 5 | SpecificFC (g/kWh), CO₂: g/km, g/tkm, g/m³km, g/Pkm |
| **Güç & Enerji** | 18 | P_wheel, P_fcmap (kW); E_fcmap, E_inertia, E_aux (FAN/STP/sum), E_clutch/gbx/ret/axl_loss, E_brake, E_air, E_roll, E_grad (kWh) |
| **Bus Aux Enerji** | 15 | PS air consumed/generated (Nl), E_PS/ES/HVAC (mech+el), E_AuxHeater, E_WHR (el+mech) (kWh) |
| **Sürüş Dinamiği** | 17 | a/a_pos/a_neg (m/s²), Accel/Decel/Cruise/Stop/FullLoad/ICEoff/Coast/Brake TimeShare (%), max speed/acc/dec, n_eng avg/max (rpm), gear shifts |
| **Sertifikalar** | 15 | Engine/Gearbox/Retarder/Angledrive/Axlegear/AirDrag cert no/option/method, avg efficiency |
| **Vites Payları** | 13 | Gear 0-12 TimeShare (%) |

---

## 6. Karşılaştırma

| | Input | RSLT_MFR | RSLT_PRIMARY | RSLT_CUSTOMER | .vsum |
|---|-------|----------|-------------|---------------|-------|
| **Format** | XML | XML | XML | XML | CSV |
| **Araç Alanları** | 18 | 25 | 15 | 33 | ~80 |
| **Bileşen Detayı** | Tam (haritalar) | Özet | Orta | Özet | Temel |
| **Haritalar** | FC+FullLoad+Gbx+Axle | — | — | — | — |
| **Sonuç** | — | 4 misyon | 4 misyon | 4 misyon + Summary | Çoklu satır |
| **Performans** | — | 11 metrik | 11 metrik | — | ~40 kolon |
| **Yakıt Birimleri** | — | 6 | 6 | 6 | 30+ (adım adım) |
| **CO₂ Birimleri** | — | 2 | 2 | 2 + Summary | 4 |
| **Enerji Denge** | — | — | — | — | ~40 kolon |
| **İmza** | Bileşen başına | 1 | 1 | 4+1 | SHA256 |
| **Boyut** | 150-300 KB | 5-15 KB | 5-15 KB | 5-15 KB | 10-50 KB |
