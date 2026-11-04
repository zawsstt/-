import { ChapterId, LevelConfig, StoryCutsceneEvent } from './types';

export type Locale = 'zh' | 'en';

const LOCALE_STORAGE_KEY = 'chaosheng_dc_locale_v1';

export function getInitialLocale(): Locale {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const langParam = params.get('lang');
    if (langParam === 'zh' || langParam === 'en') {
      return langParam;
    }
    try {
      const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (saved === 'zh' || saved === 'en') {
        return saved;
      }
    } catch {
      // Ignore storage errors
    }
  }
  return 'zh';
}

export function saveLocalePreference(locale: Locale): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    }
  } catch {
    // Ignore storage errors
  }
}

export interface DialogueScriptLine {
  speaker: { zh: string; en: string };
  role: { zh: string; en: string };
  avatarType: 'paige_sre' | 'ian_intern' | 'vp_suit' | 'kernel_ai';
  mood: 'calm' | 'urgent' | 'panic' | 'triumph';
  text: { zh: string; en: string };
}

export interface ChapterNarrativePack {
  id: ChapterId;
  code: { zh: string; en: string };
  title: { zh: string; en: string };
  subtitle: { zh: string; en: string };
  mechanicFocus: { zh: string; en: string };
  introCutscene: DialogueScriptLine[];
}

export const CHAPTER_NARRATIVE_PACKS: Record<ChapterId, ChapterNarrativePack> = {
  prologue: {
    id: 'prologue',
    code: { zh: '序章 PROLOGUE', en: 'PROLOGUE' },
    title: {
      zh: '序章：夜班开始 (Night Shift Begins)',
      en: 'Prologue: Night Shift Begins',
    },
    subtitle: {
      zh: '临海市“潮声数据中心”地下一层 · 00:00 AM',
      en: 'Linhai City "Chaosheng Data Center" B1 · 00:00 AM',
    },
    mechanicFocus: {
      zh: '经典七拍子 (1-2-3-4-5-6-[7]) 与共鸣维护仪校准',
      en: 'Classic 7-Beat Resonance & Instrument Calibration',
    },
    introCutscene: [
      {
        speaker: { zh: '阿葵 (调度员)', en: 'A-KUI (DISPATCHER)' },
        role: { zh: '夜班对讲机调度', en: 'NIGHT-SHIFT RADIO DISPATCH' },
        avatarType: 'paige_sre',
        mood: 'calm',
        text: {
          zh: '喂喂，听得到吗，“手指工程师”？欢迎来到临海市潮声数据中心地下一层。外面整座城市都睡了，但我们这儿的机柜还在替夜里的人转着。',
          en: 'Testing, 1-2... Can you hear me, "Finger Engineer"? Welcome to B1 of Chaosheng Data Center. Outside, Linhai City is asleep, but these racks keep turning for everyone still awake.',
        },
      },
      {
        speaker: { zh: '阿葵 (调度员)', en: 'A-KUI (DISPATCHER)' },
        role: { zh: '夜班对讲机调度', en: 'NIGHT-SHIFT RADIO DISPATCH' },
        avatarType: 'paige_sre',
        mood: 'calm',
        text: {
          zh: '你手边的老式“共鸣维护仪”只有一个规矩：听准机柜自身的音乐脉搏，前 6 拍稳稳数，只有在第 7 拍按下维护键，电流、风扇和系统时钟才会重新对齐。',
          en: 'Your vintage Resonance Maintenance Instrument has only one rule: listen to the song pulse of each rack, count 1 through 6 with the music, and press SPACE on the 7th beat to realign current and clock.',
        },
      },
      {
        speaker: { zh: '顾潮 (资深工程师)', en: 'GU CHAO (SENIOR SRE)' },
        role: { zh: '远程连线前辈', en: 'REMOTE SENIOR ENGINEER' },
        avatarType: 'ian_intern',
        mood: 'urgent',
        text: {
          zh: '记住，我们修的从来不是冷冰冰的铁皮机器，而是每排机柜背后连着的活人。先在赛前校准台试两下第 7 拍，手感对了我们就切进主曲！',
          en: 'Remember: what we repair is never just cold iron—it is the people behind every rack. Lock in a couple of 7th-beat practice hits on the calibration line first, then we drop into the main song!',
        },
      },
    ],
  },
  chapter1: {
    id: 'chapter1',
    code: { zh: '第一章 CH.1', en: 'CHAPTER 1' },
    title: {
      zh: '第一章：断电排查 (Power-Failure Diagnosis)',
      en: 'Chapter 1: Power-Failure Diagnosis',
    },
    subtitle: {
      zh: 'C排校园论坛 · D排深夜外卖 · E排不眠夜电台',
      en: 'Row C Campus Forum · Row D Delivery · Row E Night Radio',
    },
    mechanicFocus: {
      zh: '原声曲谱直驱 · 犹豫空拍 (Skip) · 二拍子跳变 (2-Beat SVT) · 摇摆拍',
      en: 'Song-Driven Beatmaps · Hesitation Skip · 2-Beat SVT · Swing Groove',
    },
    introCutscene: [
      {
        speaker: { zh: '阿葵 (调度员)', en: 'A-KUI (DISPATCHER)' },
        role: { zh: '夜班对讲机调度', en: 'NIGHT-SHIFT RADIO DISPATCH' },
        avatarType: 'paige_sre',
        mood: 'urgent',
        text: {
          zh: '凌晨一点半，老楼经历了一次瞬时电压跌落！C排、D排、E排的业务机柜全都出现了节拍畸变。',
          en: '01:30 AM—a voltage sag just hit the basement! Rows C, D, and E are all suffering rhythmic clock distortion.',
        },
      },
      {
        speaker: { zh: '顾潮 (资深工程师)', en: 'GU CHAO (SENIOR SRE)' },
        role: { zh: '远程连线前辈', en: 'REMOTE SENIOR ENGINEER' },
        avatarType: 'ian_intern',
        mood: 'calm',
        text: {
          zh: '别靠乱按！C排有个男生在论坛写表白一直按退格，机柜第4-6拍会静默；D排是全城夜宵洪峰；E排深夜电台的老风扇会在间奏跳成“一、二！”的急促二拍子。',
          en: 'Do not mash the key! In Row C a student keeps backspacing his confession (beats 4-6 go silent); Row D is the midnight takeout rush; Row E is the Sleepless Night radio station whose worn fan jumps into rapid 2-beat SVT!',
        },
      },
      {
        speaker: { zh: '阿葵 (调度员)', en: 'A-KUI (DISPATCHER)' },
        role: { zh: '夜班对讲机调度', en: 'NIGHT-SHIFT RADIO DISPATCH' },
        avatarType: 'paige_sre',
        mood: 'triumph',
        text: {
          zh: '把耳朵交给音乐本身的律动——鼓点和旋律会带着你走，到了第 7 拍果断合闸！',
          en: 'Trust the song itself—let the drums and melody carry your count, and strike cleanly on the 7th beat!',
        },
      },
    ],
  },
  chapter2: {
    id: 'chapter2',
    code: { zh: '第二章 CH.2', en: 'CHAPTER 2' },
    title: {
      zh: '第二章：机器背后的人 (People Behind the Machines)',
      en: 'Chapter 2: The People Behind the Machines',
    },
    subtitle: {
      zh: '跨城视频连线 · 绿植温控室 · 急诊调度专线',
      en: 'Cross-City Video · Conservatory Rack · ER Dispatch Line',
    },
    mechanicFocus: {
      zh: '半拍反拍 (&7) · 双轨交错复调 · 慢速深呼吸节拍',
      en: 'Off-Beat Syncopation (&7) · Dual-Bay Polyrhythm · Slow Breaths',
    },
    introCutscene: [
      {
        speaker: { zh: '阿葵 (调度员)', en: 'A-KUI (DISPATCHER)' },
        role: { zh: '夜班对讲机调度', en: 'NIGHT-SHIFT RADIO DISPATCH' },
        avatarType: 'paige_sre',
        mood: 'calm',
        text: {
          zh: '到了后半夜，F排到I排跑的都是最牵挂人的连接：异地父母和孩子的视频、医院急诊车的绿波带、守夜老人的陪伴播客。',
          en: 'Past 02:00 AM, Rows F through I carry the connections that matter most: cross-city family calls, ambulance green-wave routing, and late-night companionship streams.',
        },
      },
      {
        speaker: { zh: '顾潮 (资深工程师)', en: 'GU CHAO (SENIOR SRE)' },
        role: { zh: '远程连线前辈', en: 'REMOTE SENIOR ENGINEER' },
        avatarType: 'ian_intern',
        mood: 'calm',
        text: {
          zh: '跨城光缆有半拍的物理延迟（反拍 &7），两排机柜还会同时并行运转。稳住呼吸，听清主歌和副轨的律动。',
          en: 'Cross-city fiber introduces a half-beat syncopation (&7), and twin racks will run in parallel. Keep your breathing steady and listen to how the two rhythms interlock.',
        },
      },
    ],
  },
  chapter3: {
    id: 'chapter3',
    code: { zh: '第三章 CH.3', en: 'CHAPTER 3' },
    title: {
      zh: '第三章：幽灵进程 (The Ghost Process)',
      en: 'Chapter 3: The Ghost Process',
    },
    subtitle: {
      zh: '核心隔离区 · 无法被 kill -9 的残留信号',
      en: 'Quarantine Core · The Unkillable Lingering Process',
    },
    mechanicFocus: {
      zh: '视觉弹窗遮挡 · 信号隐身空拍 · 盲打听音合闸',
      en: 'Visual Popup Interference · Cloaked Beats · Blind Ear-Only Hits',
    },
    introCutscene: [
      {
        speaker: { zh: '幽灵进程 (PID ???)', en: 'LINGERING PROCESS (PID ???)' },
        role: { zh: '残留守护进程', en: 'RESIDUAL DAEMON SIGNAL' },
        avatarType: 'vp_suit',
        mood: 'panic',
        text: {
          zh: '……不要拔掉电源……还有最后一段未保存的留言没有发出去……',
          en: '...Do not pull the plug... There is still one last unsaved voice memo waiting to be delivered...',
        },
      },
      {
        speaker: { zh: '阿葵 (调度员)', en: 'A-KUI (DISPATCHER)' },
        role: { zh: '夜班对讲机调度', en: 'NIGHT-SHIFT RADIO DISPATCH' },
        avatarType: 'paige_sre',
        mood: 'urgent',
        text: {
          zh: '屏幕被报错弹窗和静电雪花挡住了！别被眼睛骗了，闭上眼听音乐的鼓点——你的耳朵比显示器更准！',
          en: 'Error popups and CRT static are blocking the monitor! Do not let your eyes fool you—listen to the drum groove of the song. Your ears are more accurate than the screen!',
        },
      },
    ],
  },
  chapter4: {
    id: 'chapter4',
    code: { zh: '第四章 CH.4', en: 'CHAPTER 4' },
    title: {
      zh: '第四章：深夜抢修 (Late-Night Repair)',
      en: 'Chapter 4: Late-Night Repair',
    },
    subtitle: {
      zh: '顾潮的强行重启危机 · 7/8 奇数拍与高温过载',
      en: "Gu Chao's Forced Reboot Crisis · 7/8 Meter & Thermal Overload",
    },
    mechanicFocus: {
      zh: '7/8 奇数节拍 (第7拍提前半拍) · 反向总线 · 断电黑屏盲打',
      en: '7/8 Irregular Meter · Reversed Bus · Blackout Blind Mode',
    },
    introCutscene: [
      {
        speaker: { zh: '顾潮 (资深工程师)', en: 'GU CHAO (SENIOR SRE)' },
        role: { zh: '远程连线前辈', en: 'REMOTE SENIOR ENGINEER' },
        avatarType: 'ian_intern',
        mood: 'panic',
        text: {
          zh: '是我太急了……刚才强行跳过自检全量重启，差点把整排冷备盘里的市民档案冲掉！',
          en: 'I was too impatient... Forcing a cold reboot without syncing nearly wiped the municipal archive array!',
        },
      },
      {
        speaker: { zh: '阿葵 (调度员)', en: 'A-KUI (DISPATCHER)' },
        role: { zh: '夜班对讲机调度', en: 'NIGHT-SHIFT RADIO DISPATCH' },
        avatarType: 'paige_sre',
        mood: 'urgent',
        text: {
          zh: '现在只能顺着每台设备自己的脾气来了！注意 7/8 拍的短促收尾，就算机房照明跳闸全黑，也要凭音乐把第 7 拍敲准！',
          en: 'Now we have to respect each machine’s own tempo! Watch for the clipped 7/8 turnaround, and even if the room goes pitch-black, land Beat 7 by ear!',
        },
      },
    ],
  },
  finale: {
    id: 'finale',
    code: { zh: '终章 FINALE', en: 'FINALE' },
    title: {
      zh: '终章：全量恢复与破晓 (Full Recovery & Daybreak)',
      en: 'Finale: Full Recovery & Daybreak',
    },
    subtitle: {
      zh: '05:45 AM · 潮声数据中心全排合奏 · 临海市的清晨',
      en: '05:45 AM · All Racks in Symphony · Dawn Over Linhai City',
    },
    mechanicFocus: {
      zh: '多机柜终极合奏 · 全城服务 200 OK 破晓恢复',
      en: 'Multi-Rack Grand Finale · City-Wide HTTP 200 OK Daybreak',
    },
    introCutscene: [
      {
        speaker: { zh: '阿葵 (调度员)', en: 'A-KUI (DISPATCHER)' },
        role: { zh: '夜班对讲机调度', en: 'NIGHT-SHIFT RADIO DISPATCH' },
        avatarType: 'paige_sre',
        mood: 'triumph',
        text: {
          zh: '看气窗外面——天快亮了！早班公交、早餐铺收款码、校园广播、跨海大桥路灯……全都在等最后这一记总合闸。',
          en: 'Look out the high window—dawn is breaking! Morning buses, breakfast stall QR codes, campus radio, sea-bridge lights... everyone is waiting on this final master sync.',
        },
      },
      {
        speaker: { zh: '顾潮 (资深工程师)', en: 'GU CHAO (SENIOR SRE)' },
        role: { zh: '远程连线前辈', en: 'REMOTE SENIOR ENGINEER' },
        avatarType: 'ian_intern',
        mood: 'triumph',
        text: {
          zh: '手指工程师，最后一组共鸣了。听准全机房的大合奏——一、二、三、四、五、六、七！',
          en: 'Finger Engineer, this is the final resonance sequence. Listen to the entire server hall sing together—1, 2, 3, 4, 5, 6, SEVEN!',
        },
      },
    ],
  },
};

export interface LevelLocalizedText {
  name: string;
  rackRow: string;
  subtitle: string;
  serviceUser: string;
  patientDescription: string;
  onSuccessMessage: string;
  tutorialGoal: string;
  tutorialTip: string;
  openingDialogue: DialogueScriptLine[];
  midSongCutscenes?: Array<{
    startBar: number;
    endBar: number;
    speaker: string;
    role: string;
    avatarType: 'paige_sre' | 'ian_intern' | 'vp_suit' | 'kernel_ai';
    mood: 'calm' | 'urgent' | 'panic' | 'triumph';
    text: string;
  }>;
}

export const LEVEL_ZH_MAP: Record<string, LevelLocalizedText> = {
  heap_leak: {
    name: 'P-1: 第一盏绿灯 (The First Green Light)',
    rackRow: 'A排 (入口主干机柜)',
    subtitle: '100 BPM · 入口机柜网线松动，跟随阿葵数拍完成第一次第7拍合闸。',
    serviceUser: '潮声数据中心 — A排主心跳总线与夜班门禁系统',
    patientDescription:
      '你在潮声数据中心值夜班的第一晚。A排入口的老机柜因为网线松动导致心跳不稳。听准音乐自身的节拍，跟随对讲机里阿葵的引导，在第 7 拍按下空格键合闸！',
    onSuccessMessage: '值班日志 [00:12 AM]：“第一盏绿灯亮了。风扇声稳下来了。”',
    tutorialGoal: '赛前校准：听准音乐节拍 1-2-3-4-5-6，在第 7 拍按下 [空格键] 完成 2 次合闸',
    tutorialTip: '阿葵提示：“别急着看杂乱的灯，听音乐里的鼓点和低音，数到 7 再按！”',
    openingDialogue: [
      {
        speaker: { zh: '阿葵 (调度员)', en: 'A-KUI (DISPATCHER)' },
        role: { zh: '对讲机引导', en: 'RADIO DISPATCH' },
        avatarType: 'paige_sre',
        mood: 'calm',
        text: {
          zh: '手指工程师，先看眼前的 A 排 1 号机柜。它的网线卡扣松了，每次脉搏走到第 7 拍就会掉压。',
          en: 'Finger Engineer, look at Row A Rack 01 in front of you. Its patch latch came loose, dropping voltage every 7th beat.',
        },
      },
      {
        speaker: { zh: '阿葵 (调度员)', en: 'A-KUI (DISPATCHER)' },
        role: { zh: '对讲机引导', en: 'RADIO DISPATCH' },
        avatarType: 'paige_sre',
        mood: 'calm',
        text: {
          zh: '我们先在赛前校准模式试 2 次：跟着音乐数“一、二、三、四、五、六”，在第 7 拍落下的瞬间按下 [空格键]！',
          en: 'Let’s do 2 quick warmup hits first: count 1-2-3-4-5-6 with the music, and press [SPACE] right as Beat 7 lands!',
        },
      },
    ],
    midSongCutscenes: [
      {
        startBar: 0,
        endBar: 1,
        speaker: '阿葵 (调度员)',
        role: '夜班对讲机',
        avatarType: 'paige_sre',
        mood: 'calm',
        text: '机房断了，抢修开始！一、二、三、四、五、六、七——听准音乐的第 7 拍按下空格！',
      },
      {
        startBar: 3,
        endBar: 4,
        speaker: '阿葵 (调度员)',
        role: '夜班对讲机',
        avatarType: 'paige_sre',
        mood: 'urgent',
        text: '别慌！副柜切进了半拍延迟 (&7)，只要指示灯由红转绿，你就按对了！',
      },
      {
        startBar: 5,
        endBar: 5,
        speaker: '阿葵 (调度员)',
        role: '应急照明跳闸',
        avatarType: 'paige_sre',
        mood: 'panic',
        text: 'A排照明闪断了一小节！别管屏幕，用耳朵听音乐的律动在黑暗里敲准第 7 拍！',
      },
    ],
  },
  p2_captain_chart: {
    name: 'P-2: 老船长的海图 (The Old Captain’s Chart)',
    rackRow: 'B排 (海图档案柜)',
    subtitle: '104 BPM · 退休船长存了半辈子的远航照片，顺着老硬盘的摇摆律动合闸。',
    serviceUser: '退休远洋船长 — 跨越三十年的航海胶片与海图备份',
    patientDescription:
      'B排机柜门上贴着一张泛黄的旧海图——那是位退休老船长租下的私有云，存着他半辈子的航海照片。老机械硬盘磁头有点轻微摇摆 (Swing)，顺着它像海浪一样的律动在第 7 拍合闸。',
    onSuccessMessage: '老船长语音留言：“小伙子，谢谢你啊，老照片一张都没丢。”',
    tutorialGoal: '赛前校准：感受 104 BPM 的温暖律动，在第 7 拍完成 2 次稳健合闸',
    tutorialTip: '顾潮提示：“老机器不能硬催，顺着它的海浪摇摆节奏走，第 7 拍稳稳落下。”',
    openingDialogue: [
      {
        speaker: { zh: '顾潮 (资深工程师)', en: 'GU CHAO (SENIOR SRE)' },
        role: { zh: '远程连线前辈', en: 'REMOTE SENIOR ENGINEER' },
        avatarType: 'ian_intern',
        mood: 'calm',
        text: {
          zh: 'B排这台存储柜转了整整十二年，里面是一位老船长半辈子的远洋海图。老磁盘寻道像船在浪上晃，千万别急躁。',
          en: 'Row B has been spinning for twelve years holding an old captain’s voyage charts. Its aging drive head sways like ocean waves—never rush it.',
        },
      },
      {
        speaker: { zh: '阿葵 (调度员)', en: 'A-KUI (DISPATCHER)' },
        role: { zh: '夜班对讲机', en: 'RADIO DISPATCH' },
        avatarType: 'paige_sre',
        mood: 'calm',
        text: {
          zh: '先跟老磁盘做 2 次热身共鸣，感受它轻柔的摇摆拍 (Swing)，准备好了我们就正式恢复海图扇区！',
          en: 'Warm up with 2 practice hits to feel its gentle Swing groove, then we’ll restore the chart sectors for real!',
        },
      },
    ],
    midSongCutscenes: [
      {
        startBar: 0,
        endBar: 1,
        speaker: '顾潮 (远程连线)',
        role: '资深工程师',
        avatarType: 'ian_intern',
        mood: 'calm',
        text: '别催老机器，顺着它的步子来。让老船长的磁盘平顺地转起来。',
      },
      {
        startBar: 3,
        endBar: 5,
        speaker: '阿葵 (调度员)',
        role: '夜班对讲机',
        avatarType: 'paige_sre',
        mood: 'calm',
        text: '磁头开始随海浪轻轻摇摆 (Swing Groove) 了！跟着贝斯和鼓点的律动，第 7 拍依然稳稳落点！',
      },
    ],
  },
  c1_1_hesitating_message: {
    name: '1-1: 写了又删的那句话 (Samurai Techno OST)',
    rackRow: 'C排 (大学校园论坛)',
    subtitle: '130 BPM · 76秒完整原声《东方电舞曲》 · 犹豫退格空拍与合成器爆发',
    serviceUser: '临海大学论坛男生 — 凌晨一点在对话框里写了又删十二次的表白',
    patientDescription:
      'C排是大学校园论坛服务器。凌晨一点，有个男生在聊天框里把同一句表白敲了又删掉十二次——前奏光标闪烁，鼓点爬升时心跳空拍（第4-6拍静默），副歌电子合成器爆发时帮他把消息发出去！',
    onSuccessMessage: '论坛日志 [01:18 AM]：那条写了又删十二次的消息终于发了出去，对面秒回了一个：“嗯。”',
    tutorialGoal: '赛前校准：锁定 130 BPM 电子脉冲，哪怕中途出现空拍也在心里默数到第 7 拍合闸！',
    tutorialTip: '阿葵提示：“这首是 130 BPM 原声曲目！第 4、5、6 拍隐藏时，跟着原曲的鼓点默数，第 7 拍果断出手！”',
    openingDialogue: [
      {
        speaker: { zh: '阿葵 (调度员)', en: 'A-KUI (DISPATCHER)' },
        role: { zh: 'C排论坛监控', en: 'ROW C FORUM MONITOR' },
        avatarType: 'paige_sre',
        mood: 'calm',
        text: {
          zh: '噗，你看 C 排校园论坛的会话缓存——有个男生对着同一个对话框敲敲删删半小时了，连服务器心跳都跟着他一顿一顿的。',
          en: 'Haha, look at the session buffer on Row C Campus Forum—some guy has been typing and backspacing in the same chat box for half an hour!',
        },
      },
      {
        speaker: { zh: '顾潮 (资深工程师)', en: 'GU CHAO (SENIOR SRE)' },
        role: { zh: '远程连线前辈', en: 'REMOTE SENIOR ENGINEER' },
        avatarType: 'ian_intern',
        mood: 'urgent',
        text: {
          zh: '它不是坏了，是在犹豫！当他狂按退格键时，第 4、5、6 拍的提示会消失（粉红 X 标记），你要完全顺着 130 BPM 原曲本身的电子鼓点在心里默数，第 7 拍帮他推一把！',
          en: 'It’s not broken—it’s hesitating! When he hits Backspace, beats 4-5-6 go silent (pink X). Count along with the 130 BPM synth drums in your head and hit Beat 7!',
        },
      },
    ],
    midSongCutscenes: [
      {
        startBar: 0,
        endBar: 1,
        speaker: '阿葵 (调度员)',
        role: 'C排论坛监控',
        avatarType: 'paige_sre',
        mood: 'calm',
        text: '【前奏 · 光标闪烁】完全听原曲的 130 BPM 电子合成器律动，每一小节第 7 拍稳稳合闸！',
      },
      {
        startBar: 4,
        endBar: 6,
        speaker: '阿葵 (调度员)',
        role: '犹豫空拍预警',
        avatarType: 'paige_sre',
        mood: 'urgent',
        text: '【鼓点爬升 · 退格犹豫】他在按退格键！第 4、5、6 拍被粉红 X 隐去了，听原曲鼓点默数，第 7 拍按！',
      },
      {
        startBar: 7,
        endBar: 9,
        speaker: '顾潮 (远程连线)',
        role: '资深工程师',
        avatarType: 'ian_intern',
        mood: 'urgent',
        text: '【副歌爆发 · 心跳加速】合成器主旋律进来了！顺着音乐的重拍推进，别让他掉线！',
      },
      {
        startBar: 13,
        endBar: 15,
        speaker: '阿葵 (调度员)',
        role: 'C排论坛监控',
        avatarType: 'paige_sre',
        mood: 'triumph',
        text: '【终章 · 按下发送】他不删了！最后几记第 7 拍，帮他把这句表白平平安安送过去！',
      },
    ],
  },
  c1_2_delivery_orders: {
    name: '1-2: 高峰期的外卖单 (Peak-Hour Delivery OST)',
    rackRow: 'D排 (全城外卖派单)',
    subtitle: '112 BPM · 137秒完整纯音乐原声与36记精准曲谱 (Am - F - C - G)',
    serviceUser: '街头奔波的夜班骑手与饥肠辘辘的加班人',
    patientDescription:
      'D排是全城外卖派单服务器。深夜的夜宵订单像潮水一样涌进来，由 137 秒完整原声曲谱 (112 BPM · Am-F-C-G · 36 记第7拍合闸) 直接驱动：报警引子 → 队列排查 → 高峰副歌 I → 鼓点抽离桥段 → 全城派单副歌 II → 恢复。',
    onSuccessMessage: '派单日志 [01:52 AM]：骑手们陆续接单，热汤面和夜宵开始在城市街头流动了。',
    tutorialGoal: '赛前校准：锁定 112 BPM (Am-F-C-G) 派单时钟，完成 2 次第 7 拍合闸即可进入 36 拍完整曲谱',
    tutorialTip: '顾潮提示：“本关由 137 秒纯音乐曲谱直接驱动，没有任何杂音干扰，听准音乐每 7 拍触发一次高压合闸！”',
    openingDialogue: [
      {
        speaker: { zh: '阿葵 (调度员)', en: 'A-KUI (DISPATCHER)' },
        role: { zh: 'D排派单监控', en: 'ROW D DISPATCH MONITOR' },
        avatarType: 'paige_sre',
        mood: 'urgent',
        text: {
          zh: 'D排全城外卖派单机柜报警！医院值班护士、代驾司机、刚下晚自习的学生……几百张热汤面订单卡在队列里发不出去！',
          en: 'Row D Delivery Dispatch is alarming! Night nurses, drivers, students... hundreds of hot noodle orders are stuck in the queue!',
        },
      },
      {
        speaker: { zh: '顾潮 (资深工程师)', en: 'GU CHAO (SENIOR SRE)' },
        role: { zh: '远程连线前辈', en: 'REMOTE SENIOR ENGINEER' },
        avatarType: 'ian_intern',
        mood: 'urgent',
        text: {
          zh: '别跟订单潮水硬抢，顺着 112 BPM (Am-F-C-G) 的音乐脉搏走！中段 1:15 桥段鼓点会突然抽离，那时候靠心里的节拍器稳住第 7 拍！',
          en: 'Do not fight the tide—ride the 112 BPM (Am-F-C-G) musical pulse! At 1:15 in the bridge the drums drop out; keep counting in your head and strike Beat 7!',
        },
      },
    ],
    midSongCutscenes: [
      {
        startBar: 0,
        endBar: 1,
        speaker: '阿葵 (调度员)',
        role: 'D排派单监控',
        avatarType: 'paige_sre',
        mood: 'urgent',
        text: '【引子 · 派单告警】骑手们都在餐馆门口等着呢！跟着 112 BPM 音乐节拍，第 7 拍合闸派单！',
      },
      {
        startBar: 3,
        endBar: 5,
        speaker: '阿葵 (调度员)',
        role: 'D排派单监控',
        avatarType: 'paige_sre',
        mood: 'calm',
        text: '【主歌 · 队列排查】热汤面、深夜豆浆、急诊室夜宵……每一记第 7 拍都能送出一批订单！',
      },
      {
        startBar: 11,
        endBar: 13,
        speaker: '顾潮 (远程连线)',
        role: '资深工程师',
        avatarType: 'ian_intern',
        mood: 'urgent',
        text: '【副歌 I · 夜宵洪峰】别跟它抢，跟上音乐的推进，别掉队！全城骑手轨迹正在同步点亮！',
      },
      {
        startBar: 20,
        endBar: 22,
        speaker: '阿葵 (调度员)',
        role: '桥段静默预警',
        avatarType: 'paige_sre',
        mood: 'panic',
        text: '【桥段 1:15 · 鼓点抽离】注意！音乐鼓点抽空了——听着和弦在心里默数 4、5、6，第 7 拍准时合闸！',
      },
      {
        startBar: 25,
        endBar: 27,
        speaker: '顾潮 (远程连线)',
        role: '资深工程师',
        avatarType: 'ian_intern',
        mood: 'triumph',
        text: '【副歌 II · 全城派单】鼓点满血回归！把最后积压的夜宵单全部派发出去！',
      },
      {
        startBar: 34,
        endBar: 35,
        speaker: '阿葵 (调度员)',
        role: 'D排派单监控',
        avatarType: 'paige_sre',
        mood: 'triumph',
        text: '【尾声 · 恢复】最后两记合闸！骑手们陆续接单，整座城市的夜宵开始流动了！',
      },
    ],
  },
  c1_3_wobbly_fan: {
    name: '1-3: 东方不眠夜 · 老风扇电台 (Battleworn Insomniac OST)',
    rackRow: 'E排 (深夜电台 FM 104.2)',
    subtitle: '100 BPM · 161秒完整原声《东方不眠夜》 · 竹笛夜雨、二拍子跳变与古筝间奏',
    serviceUser: '临海 FM 104.2 深夜电台主播与整座城市的失眠听众',
    patientDescription:
      'E排是临海市深夜电台 FM 104.2 的发射机柜。老风扇轴承磨损，带着竹笛与Lo-Fi鼓点像夜雨一样摆动（包含完整 161 秒《东方不眠夜》原声：竹笛雨声引子 → 不眠夜律动 → 0:56 聚光灯二拍子跳变 → 1:18 古筝钢琴静谧间奏 → 终章全城共鸣）。',
    onSuccessMessage: '播音日志 [02:40 AM]：电台重新恢复播出，竹笛声混着夜雨传遍临海市每一个失眠的房间。',
    tutorialGoal: '赛前校准：先适应 100 BPM 电台七拍律动，并留意中段“一、二！”的二拍子跳变节奏',
    tutorialTip: '阿葵提示：“这首是 161 秒完整《东方不眠夜》！0:56 聚光灯亮起时会切换成干脆的二拍子 (1-2)，跟着原曲人声与鼓点走！”',
    openingDialogue: [
      {
        speaker: { zh: '阿葵 (调度员)', en: 'A-KUI (DISPATCHER)' },
        role: { zh: 'FM 104.2 监听台', en: 'FM 104.2 MONITOR' },
        avatarType: 'paige_sre',
        mood: 'calm',
        text: {
          zh: '凌晨两点十五分，冷却塔外面下着大雨。E排机柜正转播着临海市深夜电台 FM 104.2 的《不眠夜点歌台》，好多失眠的人都开着收音机呢。',
          en: '02:15 AM. Outside the cooling tower it is pouring rain. Row E is broadcasting Linhai FM 104.2’s "Sleepless Night" request show to insomniacs across the city.',
        },
      },
      {
        speaker: { zh: '顾潮 (资深工程师)', en: 'GU CHAO (SENIOR SRE)' },
        role: { zh: '远程连线前辈', en: 'REMOTE SENIOR ENGINEER' },
        avatarType: 'ian_intern',
        mood: 'urgent',
        text: {
          zh: '这台老发射机的散热风扇轴承磨偏了：平时是舒缓的 100 BPM 竹笛七拍子，但到了 0:56 间奏轴承卡顿，会突然变成急促的“一、二！”二拍子跳变 (2-Beat SVT)！',
          en: 'Its worn fan bearing has a quirk: it cruises in a 100 BPM bamboo-flute 7-beat groove, then at the 0:56 spotlight breakdown it snaps into a rapid "1, 2!" Two-Beat SVT!',
        },
      },
    ],
    midSongCutscenes: [
      {
        startBar: 0,
        endBar: 1,
        speaker: '阿葵 (调度员)',
        role: 'FM 104.2 监听',
        avatarType: 'paige_sre',
        mood: 'calm',
        text: '【引子 · 夜雨竹笛】凌晨两点十五分，窗外大雨滂沱。跟着竹笛和雨声的节拍稳稳合闸。',
      },
      {
        startBar: 3,
        endBar: 4,
        speaker: '阿葵 (调度员)',
        role: 'FM 104.2 监听',
        avatarType: 'paige_sre',
        mood: 'calm',
        text: '【主歌 · 东方不眠夜】老伙计了，晃一点正常。把身体交给 Lo-Fi 鼓点和竹笛主旋律，第 7 拍合闸！',
      },
      {
        startBar: 10,
        endBar: 12,
        speaker: '顾潮 (远程连线)',
        role: '轴承跳变预警',
        avatarType: 'ian_intern',
        mood: 'urgent',
        text: '【0:56 聚光灯间奏 · 二拍子 SVT】风扇轴承跳变了！节拍缩短成“一、二！”——看准聚光灯倒计时快速合闸！',
      },
      {
        startBar: 15,
        endBar: 17,
        speaker: '阿葵 (调度员)',
        role: 'FM 104.2 监听',
        avatarType: 'paige_sre',
        mood: 'calm',
        text: '【1:18 古筝钢琴间奏】听……古筝和钢琴把载波抚平了，回到稳健的七拍子深呼吸。',
      },
      {
        startBar: 19,
        endBar: 21,
        speaker: '顾潮 (远程连线)',
        role: '资深工程师',
        avatarType: 'ian_intern',
        mood: 'triumph',
        text: '【1:38 终章共鸣】竹笛旋律全开！替临海市每一个失眠的房间守住这段电波！',
      },
    ],
  },
};

export function getLocalizedChapterMeta(chapterId: ChapterId, locale: Locale) {
  const pack = CHAPTER_NARRATIVE_PACKS[chapterId] || CHAPTER_NARRATIVE_PACKS.prologue;
  return {
    id: pack.id,
    code: pack.code[locale],
    title: pack.title[locale],
    subtitle: pack.subtitle[locale],
    mechanicFocus: pack.mechanicFocus[locale],
    openingTitle: `${pack.subtitle[locale]} · ${pack.mechanicFocus[locale]}`,
    openingBody: pack.introCutscene
      .map((line) => `${line.speaker[locale]}: "${line.text[locale]}"`)
      .join('  '),
    introCutscene: pack.introCutscene,
  };
}

export function getLocalizedLevelInfo(level: LevelConfig, locale: Locale) {
  if (locale === 'zh' && LEVEL_ZH_MAP[level.id]) {
    const zh = LEVEL_ZH_MAP[level.id];
    return {
      name: zh.name,
      rackRow: zh.rackRow,
      mechanicBadge: `${zh.rackRow} · ${level.bpm} BPM`,
      subtitle: zh.subtitle,
      serviceUser: zh.serviceUser,
      patientDescription: zh.patientDescription,
      onSuccessMessage: zh.onSuccessMessage,
      tutorialGoal: zh.tutorialGoal,
      tutorialTip: zh.tutorialTip,
    };
  }

  // Fallback smart bilingual formatting for other levels in Chinese mode
  if (locale === 'zh') {
    const rowZh = (level.rackRow || 'Row A').replace(/^Row\s+([A-Z])/i, '$1排');
    return {
      name: level.name,
      rackRow: rowZh,
      mechanicBadge: `${rowZh} · ${level.bpm} BPM`,
      subtitle: level.subtitle || `${level.bpm} BPM · 第 7 拍共鸣抢修`,
      serviceUser: level.serviceUser || '临海市深夜在线公共服务',
      patientDescription: level.patientDescription,
      onSuccessMessage:
        level.onSuccessMessage || '值班日志：机柜指示灯由红转绿，服务已恢复 200 OK。',
      tutorialGoal: `赛前校准：跟随 ${level.bpm} BPM 音乐脉搏，在第 7 拍按下 [空格键] 完成 2 次合闸`,
      tutorialTip: '阿葵提示：“听音乐本身的鼓点与和弦推进，数到第 7 拍准时按下空格！”',
    };
  }

  const zhEntry = LEVEL_ZH_MAP[level.id];
  return {
    name: level.name,
    rackRow: level.rackRow || 'Row A',
    mechanicBadge: `${level.rackRow || 'Row A'} · ${level.bpm} BPM`,
    subtitle: level.subtitle || `${level.bpm} BPM · 7th-Beat Resonance Repair`,
    serviceUser: level.serviceUser || 'Chaosheng Data Center — Critical Night Service',
    patientDescription: level.patientDescription,
    onSuccessMessage:
      level.onSuccessMessage || 'Duty Log: Rack status LED turned green. HTTP 200 OK.',
    tutorialGoal:
      zhEntry?.openingDialogue?.[1]?.text.en ||
      `Warmup Calibration: Follow the ${level.bpm} BPM song pulse and hit [SPACE] on the 7th beat twice`,
    tutorialTip:
      'A-Kui: "Let the song’s own drum groove and bassline carry Beats 1–6, and strike on Beat 7!"',
  };
}

export function getLevelOpeningDialogue(
  level: LevelConfig,
  locale: Locale
): Array<{
  speaker: string;
  role: string;
  avatarType: 'paige_sre' | 'ian_intern' | 'vp_suit' | 'kernel_ai';
  mood: 'calm' | 'urgent' | 'panic' | 'triumph';
  accentColor: string;
  text: string;
}> {
  const getAvatarAccent = (
    avatarType: 'paige_sre' | 'ian_intern' | 'vp_suit' | 'kernel_ai'
  ) =>
    avatarType === 'paige_sre'
      ? '#38bdf8'
      : avatarType === 'ian_intern'
      ? '#4ade80'
      : avatarType === 'kernel_ai'
      ? '#c084fc'
      : '#f59e0b';

  const customPack = LEVEL_ZH_MAP[level.id];
  if (customPack && customPack.openingDialogue.length > 0) {
    return customPack.openingDialogue.map((d) => ({
      speaker: d.speaker[locale],
      role: d.role[locale],
      avatarType: d.avatarType,
      mood: d.mood,
      accentColor: getAvatarAccent(d.avatarType),
      text: d.text[locale],
    }));
  }

  const chapterPack =
    CHAPTER_NARRATIVE_PACKS[level.chapterId || 'prologue'] ||
    CHAPTER_NARRATIVE_PACKS.prologue;
  const info = getLocalizedLevelInfo(level, locale);

  if (locale === 'zh') {
    return [
      {
        speaker: '阿葵 (调度员)',
        role: `${info.rackRow} 监控台`,
        avatarType: 'paige_sre',
        mood: 'calm',
        accentColor: '#38bdf8',
        text: `正在接入 ${info.name}（${info.rackRow}）。这台机柜背后连着：${info.serviceUser}。`,
      },
      {
        speaker: '顾潮 (资深工程师)',
        role: '远程连线前辈',
        avatarType: 'ian_intern',
        mood: 'urgent',
        accentColor: '#4ade80',
        text: `${info.patientDescription} 先在赛前校准线完成 2 次第 7 拍合闸，确认手感后立刻切入正曲！`,
      },
    ];
  }

  return [
    {
      speaker: 'A-KUI (DISPATCHER)',
      role: `${info.rackRow} MONITOR`,
      avatarType: 'paige_sre',
      mood: 'calm',
      accentColor: '#38bdf8',
      text: `Connecting to ${info.name} (${info.rackRow}). Behind this rack: ${info.serviceUser}.`,
    },
    {
      speaker: chapterPack.introCutscene[0]?.speaker.en || 'GU CHAO (SENIOR SRE)',
      role: 'REMOTE SENIOR ENGINEER',
      avatarType: 'ian_intern',
      mood: 'urgent',
      accentColor: '#4ade80',
      text: `${info.patientDescription} Complete 2 practice 7th-beat hits on the calibration line first, then we drop into the main song!`,
    },
  ];
}

export function getLocalizedMidSongCutscene(
  level: LevelConfig,
  barIndex: number,
  locale: Locale,
  forceCutscene: boolean = false
): StoryCutsceneEvent | null {
  if (locale === 'zh' && LEVEL_ZH_MAP[level.id]?.midSongCutscenes) {
    const list = LEVEL_ZH_MAP[level.id].midSongCutscenes!;
    const match = list.find((c) => barIndex >= c.startBar && barIndex <= c.endBar);
    if (match) return match;
    if (forceCutscene && list.length > 0) return list[0];
  }

  const fallbackList = level.cutscenes || [];
  if (fallbackList.length === 0) return null;
  const active = fallbackList.find(
    (c) => barIndex >= c.startBar && barIndex <= c.endBar
  );
  if (active) return active;
  if (forceCutscene) return fallbackList[0];
  return null;
}

export const UI_TEXT = {
  zh: {
    gameTitle: '机房抢修 // 潮声数据中心',
    gameSubtitle: '共鸣维护仪 · 听准音乐律动，在第 7 拍按下 [空格键]',
    dcBadge: '临海市潮声数据中心 // 20 关完整剧情战役',
    dataCenterBadge: '临海市潮声数据中心 // 20 关完整剧情战役',
    fictionalDisclaimer:
      '虚构声明：本游戏中的“共鸣维护仪”与“第7拍合闸修服务器”纯属虚构戏剧设定，请勿用于真实机房运维。',
    langToggleLabel: '语言: 中文 / EN',
    langLabel: '语言: 中文 / EN',
    ost11Btn: '★ 1-1 写了又删 (76秒原声)',
    ost12Btn: '★ 1-2 高峰外卖单 (137秒曲谱)',
    ost13Btn: '★ 1-3 东方不眠夜 (161秒原声)',
    chapterStoryBtn: '章节剧情片头',
    coopOn: '双人协作 [已开启]',
    coopOff: '单人值班 1P',
    coop2P: '双人协作 2P',
    solo1P: '单人值班 1P',
    freePlayOn: '自由选关 (20/20)',
    freePlayOff: 'B级晋级门禁',
    freePlay: '自由选关 (20/20)',
    rankBGate: 'B级晋级门禁',
    stageBuilderBtn: '关卡工坊',
    stageBuilder: '关卡工坊',
    calibrateBgmBtn: '延迟校准与曲库',
    calibrateBgm: '延迟校准与曲库',
    mutedBtn: '已静音 [M]',
    soundBtn: '声音开启 [M]',
    muted: '已静音 [M]',
    soundOn: '声音开启 [M]',
    behindTheMachine: '机器背后的人：',
    behindMachine: '机器背后的人：',
    standardShift: '常规班次 (1.0X)',
    nightShift: '深夜过载班 (1.15X)',
    startShiftBtn: '进入抢修现场',
    startPrefix: '进入抢修',
    unlockAndStartPrefix: '解锁并进入',
    needRankB: '需前关 B 级解锁',
    hudFault: '故障',
    faultBar: '故障进度',
    hudRack: '机柜',
    rackBar: '机柜稳定',
    hudCpuLoad: 'CPU 负载',
    cpuLoad: 'CPU 负载',
    hudCooling: '风冷',
    hudGlitch: '过载干扰',
    hudScore: '得分',
    score: '得分',
    hudSshLog: '剧情回看 [T]',
    sshLog: '剧情回看 [T]',
    hudEarly: '偏早 EARLY',
    early: '偏早 EARLY',
    hudLate: '偏晚 LATE',
    late: '偏晚 LATE',
    hudSync: '同步偏移',
    hudResonance1P: '>> 第 7 拍共鸣合闸 [空格 SPACE]',
    hudResonance2P: '>> 双人合闸 [1P:空格 | 2P:J/回车]',
    resonanceBtn: '>> 第 7 拍共鸣合闸 [空格 SPACE]',
    resonanceBtn2P: '>> 双人合闸 [1P:空格 | 2P:J/回车]',
    // Pre-Stage Story & Tutorial UI
    storyHeader: '潮声数据中心 · 现场抢修简报 (强制剧情导览)',
    storyReadingLock: '正在接收对讲机信号…',
    forcedDialogueWait: '正在接收对讲机信号… (阅读锁定中)',
    forcedDialogueReady: '[空格 / 点击] 下一句对话 ▸',
    storyNextLine: '下一句对话 [空格 / 点击]',
    storyEnterTutorial: '进入赛前节拍校准教学 [空格 / 回车]',
    storySkipToSong: '跳过导览直接进主曲 [ESC]',
    tutorialBannerTitle: '赛前共鸣校准教学 (PRE-SONG CALIBRATION)',
    warmupTitle: '赛前共鸣校准教学 (PRE-SONG WARMUP)',
    warmupProgress: '第 7 拍练习进度',
    skipWarmup: '已熟悉节奏 · 立即开始正曲 [S]',
    tutorialProgressLabel: '校准命中最少 2 次第 7 拍即可切入正式歌曲',
    tutorialHitPrompt: '跟着鼓点数 1-2-3-4-5-6，在第 7 拍按下 [空格]！',
    tutorialSkipBtn: '已熟悉节奏，立即开始正曲 → [S]',
    // Modals
    pauseTitle: '抢修暂停 // CRITICAL PAUSE',
    pauseSub: '时钟线程已挂起 · 可随时微调音频延迟偏移',
    pauseSubtitle: '时钟线程已挂起 · 可随时微调音频延迟偏移',
    audioOffsetLabel: '音频同步校准偏移：',
    resumeBtn: '继续抢修 [ESC / P]',
    restartBtn: '重新开始本关 [R]',
    quitToTitleBtn: '返回机房大厅 (主菜单)',
    abortToTitle: '返回机房大厅 (主菜单)',
    victoryTitle: 'HTTP 200 OK — 机柜共鸣抢修成功！',
    victoryNightBadge: '★ 深夜过载班荣誉解锁：首席共鸣工程师 ★',
    victoryNewRecord: '★ 刷新本排机柜最高抢修纪录！ ★',
    victoryBehindRack: '守护的服务与人：',
    victoryDaybreakHeader: '临海市 · 破晓感谢回执：',
    victoryThemeQuote: '“你修的从来不是冰冷的机器，而是机器背后深夜还在坚持的人。”',
    nextLevelBtn: '前往下一排机柜 [回车 ENTER]',
    nextRackBtn: '前往下一排机柜 [回车 ENTER]',
    retryBayBtn: '再刷一次 [R]',
    retryBtn: '再刷一次 [R]',
    baySelectBtn: '返回机柜选择',
    serverBaySelect: '返回机柜选择',
    gameOverTitle: '502 BAD GATEWAY — 机柜过热保护跳闸',
    gameOverSub: '共鸣时钟失步 · 触发 SEV-0 级生产告警',
    gameOverSubtitle: '共鸣时钟失步 · 触发 SEV-0 级生产告警',
    gameOverRootCause: '故障诊断报告：',
    rebootRetryBtn: '重置断路器并重试 [回车 / 空格]',
  },
  en: {
    gameTitle: 'SERVER ROOM EMERGENCY REPAIR',
    gameSubtitle: 'RESONANCE MAINTENANCE INSTRUMENT · PRESS [SPACE] ON THE 7TH BEAT',
    dcBadge: 'CHAOSHENG DC // 20-LEVEL CAMPAIGN',
    dataCenterBadge: 'CHAOSHENG DC // 20-LEVEL CAMPAIGN',
    fictionalDisclaimer:
      'FICTIONAL DISCLAIMER: Resonance Maintenance & 7th-beat repair are entirely fictional.',
    langToggleLabel: 'LANG: EN / 中文',
    langLabel: 'LANG: EN / 中文',
    ost11Btn: '★ 1-1 OST (76S)',
    ost12Btn: '★ 1-2 OST (137S)',
    ost13Btn: '★ 1-3 BOSS OST (161S)',
    chapterStoryBtn: 'CHAPTER INTRO',
    coopOn: '2P CO-OP [ON]',
    coopOff: '1P SOLO',
    coop2P: '2P CO-OP',
    solo1P: '1P SOLO',
    freePlayOn: 'FREE PLAY (20/20)',
    freePlayOff: 'RANK B GATE',
    freePlay: 'FREE PLAY (20/20)',
    rankBGate: 'RANK B GATE',
    stageBuilderBtn: 'STAGE BUILDER',
    stageBuilder: 'STAGE BUILDER',
    calibrateBgmBtn: 'CALIBRATE & BGM',
    calibrateBgm: 'CALIBRATE & BGM',
    mutedBtn: 'MUTED [M]',
    soundBtn: 'SOUND [M]',
    muted: 'MUTED [M]',
    soundOn: 'SOUND [M]',
    behindTheMachine: 'BEHIND THE MACHINE:',
    behindMachine: 'BEHIND THE MACHINE:',
    standardShift: 'STANDARD (1.0X)',
    nightShift: 'NIGHT SHIFT (1.15X)',
    startShiftBtn: 'START REPAIR',
    startPrefix: 'START REPAIR',
    unlockAndStartPrefix: 'UNLOCK & START',
    needRankB: 'UNLOCK AT B',
    hudFault: 'FAULT',
    faultBar: 'FAULT',
    hudRack: 'RACK',
    rackBar: 'RACK',
    hudCpuLoad: 'CPU LOAD',
    cpuLoad: 'CPU LOAD',
    hudCooling: 'COOLING',
    hudGlitch: 'GLITCH',
    hudScore: 'SCORE',
    score: 'SCORE',
    hudSshLog: 'STORY LOG [T]',
    sshLog: 'STORY LOG [T]',
    hudEarly: 'EARLY',
    early: 'EARLY',
    hudLate: 'LATE',
    late: 'LATE',
    hudSync: 'SYNC',
    hudResonance1P: '>> RESONANCE [SPACE]',
    hudResonance2P: '>> 2P RESONANCE [P1:SPACE | P2:J/ENTER]',
    resonanceBtn: '>> RESONANCE [SPACE]',
    resonanceBtn2P: '>> 2P RESONANCE [P1:SPACE | P2:J/ENTER]',
    // Pre-Stage Story & Tutorial UI
    storyHeader: 'CHAOSHENG DC · ON-STAGE BRIEFING',
    storyReadingLock: 'RECEIVING RADIO TRANSMISSION...',
    forcedDialogueWait: 'RECEIVING RADIO... (READING LOCK)',
    forcedDialogueReady: '[SPACE / CLICK] NEXT LINE ▸',
    storyNextLine: 'NEXT DIALOGUE [SPACE / CLICK]',
    storyEnterTutorial: 'START PRE-SONG CALIBRATION [SPACE / ENTER]',
    storySkipToSong: 'SKIP TO MAIN SONG [ESC]',
    tutorialBannerTitle: 'PRE-SONG RESONANCE WARMUP',
    warmupTitle: 'PRE-SONG RESONANCE WARMUP',
    warmupProgress: 'BEAT 7 WARMUP',
    skipWarmup: 'SKIP WARMUP → START SONG [S]',
    tutorialProgressLabel: 'Land 2 practice 7th-beat hits to launch the main song',
    tutorialHitPrompt: 'Count 1-2-3-4-5-6 with the groove and press [SPACE] on Beat 7!',
    tutorialSkipBtn: 'SKIP WARMUP & START SONG → [S]',
    // Modals
    pauseTitle: 'CRITICAL PAUSE',
    pauseSub: 'THREAD SUSPENDED · CPU RE-SCHEDULING IDLE',
    pauseSubtitle: 'THREAD SUSPENDED · CPU RE-SCHEDULING IDLE',
    audioOffsetLabel: 'AUDIO SYNC OFFSET:',
    resumeBtn: 'RESUME [ESC / P]',
    restartBtn: 'RESTART INCIDENT [R]',
    quitToTitleBtn: 'ABORT TO TITLE',
    abortToTitle: 'ABORT TO TITLE',
    victoryTitle: 'HTTP 200 OK — RESONANCE RESTORED!',
    victoryNightBadge: '★ NIGHT SHIFT TITLE UNLOCKED: RESONANCE MASTER ★',
    victoryNewRecord: '★ NEW PERSONAL SERVER BAY RECORD! ★',
    victoryBehindRack: 'BEHIND THE RACK: ',
    victoryDaybreakHeader: 'LINHAI CITY · DAYBREAK MESSAGES RECEIVED:',
    victoryThemeQuote: '"What you repair isn’t the machine — it’s the people behind it."',
    nextLevelBtn: 'NEXT RACK ROW / PLAY AGAIN [ENTER]',
    nextRackBtn: 'NEXT RACK ROW / PLAY AGAIN [ENTER]',
    retryBayBtn: 'RETRY BAY [R]',
    retryBtn: 'RETRY BAY [R]',
    baySelectBtn: 'SERVER BAY SELECT',
    serverBaySelect: 'SERVER BAY SELECT',
    gameOverTitle: '502 BAD GATEWAY',
    gameOverSub: 'CLUSTER FLATLINED · PRODUCTION INCIDENT SEV-0',
    gameOverSubtitle: 'CLUSTER FLATLINED · PRODUCTION INCIDENT SEV-0',
    gameOverRootCause: 'INCIDENT ROOT CAUSE:',
    rebootRetryBtn: 'REBOOT CLUSTER & RETRY [ENTER / SPACE]',
  },
} as const;
