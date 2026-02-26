# Event-Driven Agent OS — Phase 1 설계 문서 v2

> **핵심 변경**: 스마트폰을 센서 + 리모컨으로 활용하는 모바일 레이어 추가
> **목표**: 디지털 세계 + 물리 세계의 변화를 동시에 감지하는 3세대 에이전트 OS
> **기반**: OpenClaw 포크(서버) + React Native Expo(모바일) + Claude API
> **타겟**: 기업/팀 업무 자동화
> **라이선스**: MIT (오픈소스)

---

## 1. 핵심 철학

### 3세대 에이전트 OS

| 세대 | 트리거 | 감지 범위 | 대표 |
|------|--------|----------|------|
| 1세대 | 사람이 말 걸면 | 디지털만 | OpenClaw |
| 2세대 | 시계가 울리면 | 디지털만 | OpenFang |
| **3세대** | **세상이 바뀌면** | **디지털 + 물리** | **이 프로젝트** |

### 핵심 원칙

1. **이벤트 퍼스트**: 모든 행동의 시작점은 "세상의 변화"
2. **두 세계 통합**: 디지털 이벤트(뉴스, 주가) + 물리 이벤트(위치, 움직임) 하나의 파이프라인
3. **스마트폰 = 센서 + 리모컨**: 폰은 데이터를 수집하고, 결과를 받고, 승인하는 장치
4. **서버 = 두뇌**: 분석, 판단, AI 추론은 서버에서 처리
5. **점진적 자율성**: confirm → notify → auto로 신뢰를 쌓아감

---

## 2. 전체 시스템 아키텍처

```
┌──────────────────────────────────────────────────────────────┐
│                    이벤트 소스 (두 세계)                        │
│                                                                │
│   ┌─── 디지털 세계 ────┐    ┌──── 물리 세계 ─────┐            │
│   │ 뉴스 API           │    │ GPS (위치 변화)     │            │
│   │ 주식/코인 가격      │    │ 가속도계 (움직임)   │            │
│   │ SNS 멘션           │    │ Wi-Fi (네트워크)    │            │
│   │ 웹 변경 감지        │    │ 블루투스 (주변기기)  │            │
│   │ Webhook            │    │ 배터리 상태         │            │
│   │ 블록체인 이벤트      │    │ (스마트워치 확장:    │            │
│   └─────────┬──────────┘    │  심박수, 수면 등)   │            │
│             │               └─────────┬──────────┘            │
│             │                         │                        │
└─────────────┼─────────────────────────┼────────────────────────┘
              │                         │
              ▼                         ▼
┌─────────────────────┐    ┌──────────────────────┐
│   서버 (OpenClaw)    │◄───│  스마트폰 앱 (Expo)   │
│                     │    │                      │
│  ┌───────────────┐  │    │  센서 데이터 수집       │
│  │ Digital        │  │    │  → 서버로 전송         │
│  │ Watchers       │  │    │                      │
│  │ (뉴스,주가 등)  │  │    │  알림 수신            │
│  └───────┬───────┘  │    │  승인 버튼            │
│          │          │    │  대시보드 뷰어         │
│          ▼          │    └──────────────────────┘
│  ┌───────────────┐  │               │
│  │ Event Bus     │◄─┼───────────────┘ (센서 이벤트)
│  │ (통합 허브)    │  │
│  └───────┬───────┘  │
│          ▼          │
│  ┌───────────────┐  │
│  │ Rule Engine   │  │
│  │ (규칙 판단)    │  │
│  └───────┬───────┘  │
│          ▼          │
│  ┌───────────────┐  │
│  │ Reaction      │──┼──→ 결과를 앱에 Push 알림으로 전달
│  │ + Claude API  │  │
│  └───────────────┘  │
└─────────────────────┘
```

### 핵심 데이터 흐름

```
물리 이벤트 예시:
  iPhone GPS → "회사 Wi-Fi 접속됨" → 서버 Event Bus
  → Rule Engine: "출근 감지" 매칭
  → Claude: 오늘 일정 + 미읽은 이메일 분석
  → Push 알림 → iPhone에 아침 브리핑 카드 표시

디지털 이벤트 예시:
  뉴스 API → "경쟁사 신제품 출시" → 서버 Event Bus
  → Rule Engine: "경쟁사 뉴스" 매칭
  → Claude: 경쟁 분석 보고서 작성
  → Push 알림 → iPhone에 보고서 요약 + Slack 전달

복합 이벤트 예시 (물리 + 디지털):
  GPS "고객사 근처 도착" + CRM "해당 고객 미팅 30분 전"
  → Claude: 고객 최근 이력 + 미팅 준비 자료 요약
  → Push 알림 → iPhone에 미팅 브리핑 카드 표시
```

---

## 3. 모바일 앱 설계 (React Native + Expo)

### 왜 React Native + Expo인가

| 선택지 | 장점 | 단점 | 판단 |
|--------|------|------|------|
| **Swift (iOS 네이티브)** | 최고 성능, 센서 완벽 지원 | iOS만 지원, 학습 곡선 높음 | ❌ |
| **Flutter** | 크로스 플랫폼, 빠른 UI | Dart 언어 별도 학습 | △ |
| **React Native + Expo** | JavaScript, 풍부한 센서 라이브러리, iOS+Android 동시 | 네이티브보다 약간 느림 | ✅ |

React Native + Expo를 선택하는 결정적 이유:
- JavaScript/TypeScript로 서버(OpenClaw)와 **같은 언어** 사용
- Expo가 센서 API를 쉽게 쓸 수 있도록 이미 정리해놓음
- 입문자에게 가장 접근하기 쉬운 모바일 프레임워크
- 나중에 Android도 같은 코드로 지원 가능

### 앱의 3가지 역할

```
┌────────────────────────────────────────────┐
│            스마트폰 앱의 역할                 │
│                                            │
│  ① 센서 (데이터 수집)                        │
│     GPS, 가속도계, Wi-Fi, 블루투스 등         │
│     → 서버로 이벤트 전송                     │
│                                            │
│  ② 리모컨 (결과 확인 + 승인)                  │
│     Push 알림 수신                          │
│     승인/거절 버튼                           │
│     빠른 액션 (한 탭으로 실행)                │
│                                            │
│  ③ 대시보드 (현황 모니터링)                   │
│     활성 이벤트 목록                         │
│     에이전트 상태                            │
│     최근 행동 로그                           │
└────────────────────────────────────────────┘
```

### 모바일 센서 Watcher 설계

앱에서 수집 가능한 센서 이벤트:

| 센서 | Expo 라이브러리 | 생성하는 이벤트 | iOS 제한사항 |
|------|----------------|---------------|-------------|
| GPS | expo-location | 위치 변화, 지오펜스 진입/이탈 | 백그라운드: "항상 허용" 필요 |
| 가속도계 | expo-sensors | 움직임 감지, 흔들기 | 앱 실행 중만 가능 |
| 자이로스코프 | expo-sensors | 기기 회전 | 앱 실행 중만 가능 |
| 기압계 | expo-sensors | 고도/날씨 변화 | 앱 실행 중만 가능 |
| 만보계 | expo-sensors | 걸음 수 | 백그라운드 가능 |
| Wi-Fi | react-native-wifi-reborn | 네트워크 연결/변경 | 제한적 (iOS 보안 정책) |
| 블루투스 | react-native-ble-plx | 주변 기기 감지 | 백그라운드: 제한적 |
| 배터리 | expo-battery | 충전 상태 변화 | 이벤트 리스너 지원 |
| 밝기 | expo-sensors (Light) | 조도 변화 | ⚠️ iOS 미지원 |

### iOS 백그라운드 제한 대응 전략

iOS는 앱이 백그라운드에 있을 때 대부분의 센서 접근을 차단합니다.
이건 피할 수 없는 제약이라, 현실적인 우회 전략이 필요합니다.

```
┌─ 항상 작동 (백그라운드 OK) ─────────────────────────┐
│                                                     │
│  ✅ GPS (위치 변화) → iOS가 "중요한 위치 변화"를       │
│     감지하면 앱을 깨워줌                              │
│  ✅ Push 알림 수신 → 서버에서 보내는 알림은 항상 도착   │
│  ✅ 만보계 → HealthKit 연동으로 백그라운드 데이터 수집  │
│  ✅ 블루투스 비콘 → iBeacon은 백그라운드 감지 가능      │
│                                                     │
├─ 제한적 작동 ──────────────────────────────────────────┤
│                                                     │
│  ⚠️ 백그라운드 태스크 → iOS가 "적절한 시점"에 실행     │
│     (정확한 시점 보장 안 됨, 보통 15~30분 간격)        │
│  ⚠️ 가속도계/자이로 → 앱이 포그라운드일 때만           │
│                                                     │
├─ 서버 기반 우회 ──────────────────────────────────────┤
│                                                     │
│  💡 전략: 센서가 제한될 때 서버가 Push로 앱을 깨움      │
│     서버: "사용자가 30분째 움직임 없음, 확인 필요"      │
│     → Push 알림 → 앱 활성화 → 센서 데이터 수집         │
│     → 서버로 전송                                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**현실적 판단**: 
Phase 1에서는 **GPS(위치) + Push 알림**에 집중합니다.
이 두 가지가 iOS에서 가장 안정적으로 백그라운드에서 작동하고,
기업 시나리오에서도 가장 활용도가 높습니다.

### 앱 화면 구성

```
┌─────────────────────────────────┐
│  [탭 1: 이벤트 피드]              │
│                                 │
│  🔴 3분 전 - 경쟁사 가격 변동     │
│     경쟁사 A 가격 20% 하락 감지    │
│     → [분석 보기] [무시]          │
│                                 │
│  🟡 15분 전 - 출근 감지           │
│     회사 Wi-Fi 접속됨             │
│     → 오늘 일정 브리핑 준비 중...  │
│                                 │
│  🟢 1시간 전 - 뉴스 알림          │
│     AI 규제 관련 뉴스 3건 감지     │
│     → [보고서 읽기]              │
│                                 │
├─────────────────────────────────┤
│  [탭 2: 에이전트 상태]            │
│                                 │
│  📊 활성 에이전트: 3개            │
│  📡 감시 중인 소스: 7개           │
│  ⚡ 오늘 처리한 이벤트: 23건      │
│  💰 오늘 API 비용: $0.42         │
│                                 │
├─────────────────────────────────┤
│  [탭 3: 설정]                    │
│                                 │
│  센서 설정                       │
│    📍 위치 감시: ON               │
│    📶 Wi-Fi 감시: ON             │
│    🔔 Push 알림: ON              │
│                                 │
│  승인 레벨                       │
│    높은 위험 작업: confirm        │
│    중간 위험 작업: notify         │
│    낮은 위험 작업: auto           │
│                                 │
├─────────────────────────────────┤
│  [이벤트피드] [에이전트] [설정]    │
└─────────────────────────────────┘
```

### 앱 ↔ 서버 통신 설계

```
[스마트폰 앱]                         [서버 (OpenClaw)]

1. 센서 이벤트 전송 (앱 → 서버)
   POST /api/events/mobile
   {
     type: "location_change",
     device_id: "iphone_abc123",
     data: {
       latitude: 37.5665,
       longitude: 126.9780,
       accuracy: 10,
       speed: 0,
       wifi_ssid: "Company_5G"
     },
     timestamp: "2026-02-27T09:00:00Z"
   }

2. Push 알림 (서버 → 앱)
   Expo Push Notification
   {
     title: "경쟁사 가격 변동 감지",
     body: "경쟁사 A 가격이 20% 하락했습니다",
     data: {
       event_id: "evt_001",
       action_type: "view_report",
       approval_needed: false
     }
   }

3. 승인 응답 (앱 → 서버)
   POST /api/reactions/{reaction_id}/approve
   {
     decision: "approved",     // approved / rejected / deferred
     device_id: "iphone_abc123"
   }

4. 상태 조회 (앱 ↔ 서버)
   WebSocket: ws://server/api/dashboard
   실시간 이벤트 피드 + 에이전트 상태 스트리밍
```

---

## 4. 서버 설계 (OpenClaw 포크)

### 4.1 Watcher Layer (감시 계층)

**디지털 Watcher (서버에서 실행)**:

| Watcher | 데이터 소스 | 무료 여부 |
|---------|-----------|----------|
| `NewsWatcher` | NewsAPI, RSS | 무료 플랜 있음 |
| `PriceWatcher` | CoinGecko, Yahoo Finance | 무료 |
| `WebChangeWatcher` | 웹 스크래핑 | 무료 |
| `WebhookWatcher` | 외부 → 우리 시스템 | 무료 |

**모바일 Watcher (앱에서 실행, 서버로 전송)**:

| Watcher | 센서 | Phase 1 포함 |
|---------|------|-------------|
| `LocationWatcher` | GPS + Wi-Fi SSID | ✅ 포함 |
| `MotionWatcher` | 가속도계 | Phase 2 |
| `BeaconWatcher` | 블루투스 비콘 | Phase 2 |
| `BatteryWatcher` | 배터리 상태 | Phase 2 |
| `HealthWatcher` | 만보계/HealthKit | Phase 2 |

### 4.2 Event Bus (이벤트 버스)

모든 이벤트가 같은 형식으로 통합됩니다.
**디지털이든 물리든 Event Bus 입장에서는 구분이 없습니다.**

```yaml
# 디지털 이벤트
event:
  id: "evt_20260227_001"
  type: "price_change"
  source: "digital/coingecko/bitcoin"    # digital/ 접두사
  timestamp: "2026-02-27T09:30:00Z"
  severity: "high"
  data:
    asset: "bitcoin"
    old_price: 95000
    new_price: 102000

# 물리 이벤트 (스마트폰에서 온 것)
event:
  id: "evt_20260227_002"
  type: "geofence_enter"
  source: "mobile/iphone_abc123/gps"     # mobile/ 접두사
  timestamp: "2026-02-27T09:00:00Z"
  severity: "medium"
  data:
    zone_name: "본사"
    latitude: 37.5665
    longitude: 126.9780
    wifi_ssid: "Company_5G"
```

**이것이 핵심 차별점입니다**: 물리 이벤트와 디지털 이벤트가 하나의 
Event Bus를 공유하므로, 복합 규칙에서 자연스럽게 조합할 수 있습니다.

### 4.3 Rule Engine (규칙 엔진)

```yaml
# 규칙 예시 1: 순수 디지털
name: "BTC 급등 알림"
trigger:
  type: simple
  condition:
    event_type: "price_change"
    source: "digital/coingecko/bitcoin"
    filter: "data.change_percent > 5"
reaction:
  agent: "crypto_analyst"
  approval: notify
  channel: "push"          # 스마트폰 Push 알림으로

---
# 규칙 예시 2: 순수 물리
name: "출근 감지 브리핑"
trigger:
  type: simple
  condition:
    event_type: "geofence_enter"
    filter: "data.zone_name == '본사'"
reaction:
  agent: "morning_briefing"
  approval: auto
  channel: "push"
  prompt_context: |
    사용자가 출근했습니다 (본사 도착).
    오늘 캘린더 일정과 미읽은 중요 이메일을 요약해주세요.

---
# 규칙 예시 3: 물리 + 디지털 복합 ⭐ (이게 진짜 차별점)
name: "고객사 방문 전 브리핑"
trigger:
  type: compound
  window: 30m
  all:
    - event_type: "geofence_enter"
      filter: "data.zone_name starts_with '고객사_'"
    - event_type: "calendar"
      filter: "data.type == 'meeting' AND data.minutes_until < 30"
reaction:
  agent: "meeting_prep"
  approval: auto
  channel: "push"
  prompt_context: |
    사용자가 {events[0].data.zone_name}에 도착했고,
    30분 후 미팅이 예정되어 있습니다.
    해당 고객의 최근 거래 이력과 미팅 준비 자료를 요약해주세요.

---
# 규칙 예시 4: 패턴 감지
name: "야근 감지 및 건강 알림"
trigger:
  type: pattern
  condition:
    event_type: "geofence_exit"
    filter: "data.zone_name == '본사'"
    time_filter: "hour >= 22"    # 밤 10시 이후
    count: ">= 3"
    window: 7d                   # 7일간
reaction:
  agent: "wellness_advisor"
  approval: notify
  channel: "push"
  prompt_context: |
    사용자가 이번 주에 3회 이상 밤 10시 이후 퇴근했습니다.
    건강 관리 조언과 내일 일정 최적화 방안을 부드럽게 제안해주세요.
```

### 4.4 Reaction System (반응 시스템)

```
승인 3단계 + 모바일 통합:

auto     → 에이전트 즉시 행동 → Push 알림으로 결과 전달
notify   → 에이전트 행동 후 → Push 알림으로 결과 + 피드백 버튼
confirm  → Push 알림으로 계획 전달 → 앱에서 [승인/거절] 탭 → 실행

모바일에서 confirm 흐름:
  ┌──────────────────────────────┐
  │  🔔 승인 요청                 │
  │                              │
  │  경쟁사 가격 대응 전략 보고서를  │
  │  Slack #strategy에            │
  │  공유하려고 합니다.            │
  │                              │
  │  [✅ 승인]    [❌ 거절]        │
  │              [⏰ 나중에]       │
  └──────────────────────────────┘
```

### 안전장치

```yaml
safety:
  max_chain_depth: 5
  max_events_per_minute: 100
  max_agent_calls_per_hour: 50
  circuit_breaker:
    threshold: 10
    action: pause_and_notify
  cost_limit:
    daily_usd: 10
  mobile:
    max_sensor_uploads_per_hour: 120    # 배터리 보호
    min_location_interval: 30s          # GPS 최소 간격
    battery_saver_mode: true            # 배터리 20% 미만 시 센서 축소
```

---

## 5. 기술 스택

### 서버

| 영역 | 기술 | 이유 |
|------|------|------|
| 런타임 | Node.js (OpenClaw 기반) | OpenClaw 호환 |
| 언어 | TypeScript | 서버/앱 모두 같은 언어 |
| LLM | Claude API | 긴 컨텍스트, MCP 지원 |
| DB | SQLite | 로컬 우선, 설치 불필요 |
| Push 알림 | Expo Push Service | 무료, Expo 앱과 연동 |
| 설정 | YAML | 읽기 쉬움 |

### 모바일 앱

| 영역 | 기술 | 이유 |
|------|------|------|
| 프레임워크 | React Native + Expo | 입문자 친화, 크로스 플랫폼 |
| 언어 | TypeScript | 서버와 동일 |
| 센서 | expo-sensors, expo-location | 공식 지원, 문서 풍부 |
| 알림 | expo-notifications | Push 알림 수신/처리 |
| 백그라운드 | expo-background-task, expo-location | iOS 백그라운드 위치 지원 |
| 상태 관리 | React Context 또는 Zustand | 가벼움, 입문자 친화 |
| 서버 통신 | REST API + WebSocket | 이벤트 전송 + 실시간 대시보드 |

### 핵심 포인트: TypeScript 하나로 전체 시스템

```
서버 (OpenClaw 포크)     → TypeScript
모바일 앱 (Expo)         → TypeScript
규칙 설정                → YAML
Claude 프롬프트          → 텍스트

별도 언어를 배울 필요 없이 TypeScript + YAML만으로
서버 + 앱 + 규칙을 전부 다룰 수 있습니다.
```

---

## 6. 프로젝트 구조

```
project-root/
│
├── server/                          # 서버 (OpenClaw 포크)
│   ├── openclaw/                    # OpenClaw 원본 코드 (최소 수정)
│   └── src/
│       ├── watchers/                # 디지털 Watcher들
│       │   ├── base.ts             # 공통 인터페이스
│       │   ├── news.ts
│       │   ├── price.ts
│       │   ├── web-change.ts
│       │   └── webhook.ts
│       ├── event-bus/               # 이벤트 허브
│       │   ├── bus.ts
│       │   ├── normalizer.ts
│       │   └── store.ts            # SQLite 이벤트 저장
│       ├── rules/                   # 규칙 엔진
│       │   ├── engine.ts
│       │   ├── parser.ts
│       │   └── patterns.ts
│       ├── reactions/               # 반응 시스템
│       │   ├── dispatcher.ts
│       │   ├── approval.ts
│       │   └── safety.ts
│       ├── mobile-bridge/           # 모바일 ↔ 서버 통신 ⭐ 새로 추가
│       │   ├── api.ts              # REST 엔드포인트
│       │   ├── push.ts             # Expo Push 알림 발송
│       │   ├── websocket.ts        # 실시간 대시보드
│       │   └── device-registry.ts  # 기기 등록/관리
│       └── config/
│           ├── watchers/            # Watcher 설정 YAML
│           ├── rules/               # 규칙 설정 YAML
│           └── geofences/           # 지오펜스 설정 YAML ⭐
│
├── mobile/                          # 스마트폰 앱 ⭐ 새로 추가
│   ├── app/                         # Expo Router 페이지
│   │   ├── (tabs)/
│   │   │   ├── feed.tsx            # 이벤트 피드 탭
│   │   │   ├── agents.tsx          # 에이전트 상태 탭
│   │   │   └── settings.tsx        # 설정 탭
│   │   └── event/[id].tsx          # 이벤트 상세 + 승인 화면
│   ├── services/
│   │   ├── sensor-manager.ts       # 센서 데이터 수집 통합
│   │   ├── location-watcher.ts     # GPS + 지오펜스
│   │   ├── server-api.ts           # 서버 통신
│   │   └── push-handler.ts         # Push 알림 처리
│   ├── app.json                     # Expo 설정
│   └── package.json
│
├── shared/                          # 서버 + 앱 공유 코드
│   ├── types/
│   │   ├── event.ts                # 이벤트 형식 정의
│   │   ├── rule.ts                 # 규칙 형식 정의
│   │   └── reaction.ts            # 반응 형식 정의
│   └── constants.ts
│
└── docs/                            # 문서
    ├── README.md
    ├── WATCHER_GUIDE.md             # Watcher 개발 가이드
    ├── RULE_EXAMPLES.md             # 규칙 예시 모음
    └── MOBILE_SETUP.md              # 앱 개발 환경 설정
```

---

## 7. 개발 로드맵

### Phase 1-A: 서버 MVP (4~6주)

**목표**: 디지털 이벤트 하나의 파이프라인 완성

- [ ] OpenClaw 포크, 로컬 실행
- [ ] 이벤트 형식 정의 (shared/types)
- [ ] NewsWatcher 구현
- [ ] Event Bus 기본 구현
- [ ] 단순 Rule Engine
- [ ] Reaction → Claude → Telegram 알림
- [ ] 기본 안전장치

**완료 시 데모**: "AI 뉴스 키워드 감지 → Claude 분석 → Telegram 알림"

### Phase 1-B: 모바일 앱 기초 (4~6주)

**목표**: 앱에서 결과를 받고, 위치 이벤트를 보내는 것까지

- [ ] Expo 프로젝트 생성
- [ ] Push 알림 수신 구현
- [ ] 이벤트 피드 화면 (서버에서 목록 받아서 표시)
- [ ] 서버 API 통신 (REST)
- [ ] GPS 위치 수집 + 서버 전송
- [ ] 지오펜스 설정 (출근/퇴근 감지)
- [ ] 승인 버튼 (confirm 흐름)

**완료 시 데모**: "출근 감지 → 아침 브리핑 → iPhone Push 알림"

### Phase 1-C: 통합 + 확장 (4~6주)

- [ ] PriceWatcher, WebChangeWatcher 추가
- [ ] 복합 규칙 (물리 + 디지털 조합)
- [ ] 이벤트 체인
- [ ] 에이전트 상태 대시보드 (앱)
- [ ] WebSocket 실시간 피드
- [ ] 배터리 최적화

**완료 시 데모**: "고객사 근처 도착 + 미팅 30분 전 → 미팅 브리핑 Push"

### Phase 1-D: 커뮤니티 공개 (2~4주)

- [ ] GitHub 공개 + README
- [ ] Watcher 개발 가이드
- [ ] 규칙 템플릿 라이브러리
- [ ] 앱 TestFlight 배포 (iOS 베타 테스트)
- [ ] Discord/Telegram 커뮤니티

### Phase 2 (미래)

- [ ] 추가 센서: 가속도계, 블루투스 비콘, HealthKit
- [ ] Apple Watch 앱 (심박수, 손목 감지)
- [ ] Android 앱 (같은 코드베이스)
- [ ] 온디바이스 경량 LLM (서버 의존도 감소)
- [ ] 엣지 디바이스 확장 (라즈베리파이 등)

---

## 8. 차별화 비교표 (최종)

| | OpenClaw | OpenFang | AutoGen | **이 프로젝트** |
|---|---------|----------|---------|----------------|
| 트리거 | 사람 대화 | 타이머 | 사람/코드 | **세상의 변화** |
| 디지털 이벤트 | Webhook만 | 없음 | 없음 | **내장 Watcher** |
| 물리 이벤트 | 없음 | 없음 | 없음 | **스마트폰 센서** |
| 복합 이벤트 | 없음 | 없음 | 없음 | **Rule Engine** |
| 모바일 앱 | 없음 (채널만) | 없음 | 없음 | **전용 앱** |
| 승인 흐름 | 도구별 | RBAC | 없음 | **모바일 원탭** |
| 실행 위치 | 서버 | 서버 | 서버 | **서버 + 스마트폰** |
| 오프라인 | 불가 | 불가 | 불가 | **GPS 감지 가능** |

---

## 9. 프로젝트 이름 후보 (업데이트)

물리 + 디지털 통합이라는 정체성을 반영:

| 이름 | 의미 | 어울리는 이유 |
|------|------|-------------|
| **Nerve** | 신경 | 감각(센서) → 신경(전달) → 뇌(판단) → 행동. 인체 신경계와 구조가 동일 |
| **Reflex** | 반사 반응 | 자극 → 즉각 반응. 의식(사람)이 개입하기 전에 신체(시스템)가 먼저 반응 |
| **Pulse** | 맥박 | 세상의 맥박을 읽는다. 디지털 + 물리 양쪽의 신호를 감지 |
| **Tremor** | 미세한 진동 | 미세한 변화도 감지한다. 센서의 정밀함을 표현 |
| **Cortex** | 대뇌 피질 | 감각 정보를 종합 분석하는 뇌의 중추. 여러 센서 데이터 통합 분석 |
| **Synapse** | 시냅스 | 신경 세포 간 신호 전달 지점. 이벤트 → 반응의 연결점 |

---

## 10. 실제 기업 활용 시나리오 (모바일 통합)

### 시나리오 1: 영업팀

```
감시 (물리): 팀원 GPS → 고객사 지오펜스 진입
감시 (디지털): CRM API → 해당 고객 최근 거래 이력
규칙: 고객사 근처 + 미팅 예정 → 복합 트리거
반응: Claude가 고객 브리핑 카드 생성
결과: 영업사원 iPhone에 Push → 미팅 전 1분 요약
```

### 시나리오 2: 물류/현장팀

```
감시 (물리): 현장 직원 GPS → 작업 현장 진입
감시 (디지털): 날씨 API → 우천 예보
규칙: 현장 도착 + 비 예보 → 복합 트리거
반응: 안전 지침 + 일정 조정안 생성
결과: 현장 직원 앱에 작업 브리핑 + 안전 알림
```

### 시나리오 3: 경영/전략팀

```
감시 (디지털): 뉴스 + 경쟁사 웹 + 주가
규칙: 경쟁사 뉴스 + 가격 변동 동시 발생
반응: Claude가 경쟁 분석 보고서 작성
결과: 경영진 앱에 Push → 앱에서 [Slack 공유] 원탭 승인
```

### 시나리오 4: 원격 근무팀

```
감시 (물리): 팀원 전원 Wi-Fi 접속 상태
감시 (디지털): 캘린더 API → 스탠드업 미팅 시간
규칙: 미팅 시간 + 전원 온라인 → 트리거
반응: 어제 진행 사항 자동 요약 + 오늘 이슈 정리
결과: 팀 전원 앱에 미팅 준비 자료 Push
```

---

## 11. 시작하기 위해 필요한 것

### 준비물

| 항목 | 용도 | 비용 |
|------|------|------|
| Node.js v22+ | 서버 실행 | 무료 |
| iPhone (실제 기기) | 앱 테스트 (시뮬레이터는 센서 제한) | 이미 보유 |
| Mac | iOS 앱 개발 필수 (Xcode) | 이미 보유 시 무료 |
| Apple Developer 계정 | TestFlight 배포, Push 알림 | $99/년 |
| Claude API 키 | AI 분석 | 사용량 기준 |
| Expo 계정 | Push 알림 서비스 | 무료 |
| NewsAPI 키 | 뉴스 감시 | 무료 플랜 |
| GitHub 계정 | 오픈소스 공개 | 무료 |

### 학습 순서 (입문자 추천)

```
1주차: JavaScript/TypeScript 기초 복습
2주차: OpenClaw 포크 → 로컬에서 실행해보기
3주차: Expo 튜토리얼 → "Hello World" 앱 만들기
4주차: Phase 1-A 시작 (서버 MVP)
```

### 예상 비용

| 항목 | 월 비용 |
|------|---------|
| Claude API | $5~20 (테스트 수준) |
| Apple Developer | ~$8 ($99/년) |
| VPS (서버) | $5~10 (나중에) |
| **합계** | **월 $18~38으로 시작** |

---

## 부록: 입문자를 위한 핵심 용어 추가

| 용어 | 쉬운 설명 |
|------|----------|
| React Native | JavaScript로 iPhone/Android 앱을 동시에 만드는 도구 |
| Expo | React Native를 더 쉽게 쓸 수 있게 해주는 도구 세트 |
| 지오펜스 (Geofence) | 지도 위에 가상의 울타리를 그려놓고, 진입/이탈을 감지하는 것 |
| Push 알림 | 앱을 안 열어도 서버에서 보내는 알림 (카톡 알림과 같은 원리) |
| TestFlight | Apple이 제공하는 iOS 앱 베타 테스트 배포 서비스 |
| WebSocket | 서버와 앱이 실시간으로 계속 연결되어 있는 통신 방식 |
| REST API | 서버에 "이 데이터 줘" 또는 "이거 처리해줘"라고 요청하는 표준 방식 |
| HealthKit | Apple이 만든 건강 데이터 관리 시스템 (심박수, 걸음 수 등) |
| 백그라운드 | 앱이 화면에 안 보이는 상태에서도 뒤에서 작업하는 것 |
| 포그라운드 | 앱이 화면에 보이면서 활성화된 상태 |
| 지오펜스 | 지도 위에 가상 울타리를 설정해 진입/이탈을 감지하는 기술 |
