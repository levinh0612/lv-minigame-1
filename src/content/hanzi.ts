/* Nội dung game học chữ Hán (HSK 1): từ vựng, tên thanh điệu, danh hiệu. Luật ở engine/hanzi.ts, giao diện ở ui/minigames/hanzi.ts. */

/** 0 = thanh nhẹ (không dấu), 1 = ngang, 2 = sắc, 3 = hỏi (xuống rồi lên), 4 = huyền (xuống) */
export type Tone = 0 | 1 | 2 | 3 | 4;

export interface Hanzi { h: string; py: string; tone: Tone; vi: string }   // py: âm tiết không dấu

export const TONE_NAME: Record<Tone, string> = { 0: "Thanh nhẹ", 1: "Thanh 1 · ngang", 2: "Thanh 2 · lên", 3: "Thanh 3 · xuống rồi lên", 4: "Thanh 4 · xuống" };
export const TONE_HINT: Record<Tone, string> = { 0: "chấm một cái", 1: "gạch ngang →", 2: "gạch lên ↗", 3: "xuống rồi lên ↘↗", 4: "gạch xuống ↘" };

const H = (h: string, py: string, tone: Tone, vi: string): Hanzi => ({ h, py, tone, vi });
/** chữ đơn HSK 1, chọn các chữ phổ biến, rải đều bốn thanh và thanh nhẹ */
export const HANZI_TONES: Hanzi[] = [
  H("妈", "ma", 1, "mẹ"), H("他", "ta", 1, "anh ấy"), H("家", "jia", 1, "nhà"), H("天", "tian", 1, "trời"), H("书", "shu", 1, "sách"),
  H("听", "ting", 1, "nghe"), H("说", "shuo", 1, "nói"), H("开", "kai", 1, "mở"), H("吃", "chi", 1, "ăn"), H("喝", "he", 1, "uống"),
  H("三", "san", 1, "ba"), H("八", "ba", 1, "tám"), H("七", "qi", 1, "bảy"), H("中", "zhong", 1, "giữa"), H("高", "gao", 1, "cao"),
  H("人", "ren", 2, "người"), H("来", "lai", 2, "đến"), H("学", "xue", 2, "học"), H("年", "nian", 2, "năm"), H("茶", "cha", 2, "trà"),
  H("明", "ming", 2, "sáng"), H("前", "qian", 2, "trước"), H("钱", "qian", 2, "tiền"), H("国", "guo", 2, "nước"), H("回", "hui", 2, "về"),
  H("十", "shi", 2, "mười"), H("能", "neng", 2, "có thể"), H("和", "he", 2, "và"), H("同", "tong", 2, "cùng"), H("朋", "peng", 2, "bạn"),
  H("我", "wo", 3, "tôi"), H("你", "ni", 3, "bạn"), H("好", "hao", 3, "tốt"), H("水", "shui", 3, "nước"), H("火", "huo", 3, "lửa"),
  H("五", "wu", 3, "năm"), H("九", "jiu", 3, "chín"), H("很", "hen", 3, "rất"), H("小", "xiao", 3, "nhỏ"), H("少", "shao", 3, "ít"),
  H("米", "mi", 3, "gạo"), H("写", "xie", 3, "viết"), H("买", "mai", 3, "mua"), H("早", "zao", 3, "sớm"), H("请", "qing", 3, "mời"),
  H("大", "da", 4, "lớn"), H("不", "bu", 4, "không"), H("是", "shi", 4, "là"), H("去", "qu", 4, "đi"), H("四", "si", 4, "bốn"),
  H("六", "liu", 4, "sáu"), H("看", "kan", 4, "xem"), H("见", "jian", 4, "gặp"), H("再", "zai", 4, "lại"), H("月", "yue", 4, "tháng"),
  H("日", "ri", 4, "ngày"), H("上", "shang", 4, "trên"), H("下", "xia", 4, "dưới"), H("会", "hui", 4, "biết"), H("菜", "cai", 4, "món ăn"),
  H("饭", "fan", 4, "cơm"), H("电", "dian", 4, "điện"), H("对", "dui", 4, "đúng"), H("做", "zuo", 4, "làm"),
  H("的", "de", 0, "của"), H("吗", "ma", 0, "không (nghi vấn)"), H("呢", "ne", 0, "thì sao"), H("们", "men", 0, "(số nhiều)")
];

/** từ ghép hai chữ cho boss: vẽ lần lượt hai thanh điệu (thanh theo từ điển, không tính biến điệu) */
export interface HanziWord { w: string; a: string; b: string; ta: Tone; tb: Tone; vi: string }
const W = (w: string, a: string, b: string, ta: Tone, tb: Tone, vi: string): HanziWord => ({ w, a, b, ta, tb, vi });
export const HANZI_WORDS: HanziWord[] = [
  W("你好", "ni", "hao", 3, 3, "xin chào"), W("谢谢", "xie", "xie", 4, 0, "cảm ơn"), W("再见", "zai", "jian", 4, 4, "tạm biệt"),
  W("老师", "lao", "shi", 3, 1, "thầy cô giáo"), W("学生", "xue", "sheng", 2, 1, "học sinh"), W("朋友", "peng", "you", 2, 0, "bạn bè"),
  W("中国", "zhong", "guo", 1, 2, "Trung Quốc"), W("北京", "bei", "jing", 3, 1, "Bắc Kinh"), W("明天", "ming", "tian", 2, 1, "ngày mai"),
  W("今天", "jin", "tian", 1, 1, "hôm nay"), W("昨天", "zuo", "tian", 2, 1, "hôm qua"), W("水果", "shui", "guo", 3, 3, "trái cây"),
  W("苹果", "ping", "guo", 2, 3, "quả táo"), W("衣服", "yi", "fu", 1, 0, "quần áo"), W("喜欢", "xi", "huan", 3, 0, "thích"),
  W("漂亮", "piao", "liang", 4, 0, "xinh đẹp"), W("电话", "dian", "hua", 4, 4, "điện thoại"), W("电脑", "dian", "nao", 4, 3, "máy tính"),
  W("医生", "yi", "sheng", 1, 1, "bác sĩ"), W("医院", "yi", "yuan", 1, 4, "bệnh viện"), W("学校", "xue", "xiao", 2, 4, "trường học"),
  W("商店", "shang", "dian", 1, 4, "cửa hàng"), W("米饭", "mi", "fan", 3, 4, "cơm"), W("没有", "mei", "you", 2, 3, "không có"),
  W("现在", "xian", "zai", 4, 4, "bây giờ"), W("上午", "shang", "wu", 4, 3, "buổi sáng"), W("中午", "zhong", "wu", 1, 3, "buổi trưa"),
  W("下午", "xia", "wu", 4, 3, "buổi chiều"), W("汉语", "han", "yu", 4, 3, "tiếng Hán"), W("你们", "ni", "men", 3, 0, "các bạn"),
  W("我们", "wo", "men", 3, 0, "chúng tôi"), W("他们", "ta", "men", 1, 0, "họ"), W("什么", "shen", "me", 2, 0, "cái gì"),
  W("怎么", "zen", "me", 3, 0, "thế nào"), W("杯子", "bei", "zi", 1, 0, "cái ly"), W("桌子", "zhuo", "zi", 1, 0, "cái bàn"),
  W("椅子", "yi", "zi", 3, 0, "cái ghế"), W("爸爸", "ba", "ba", 4, 0, "bố"), W("妈妈", "ma", "ma", 1, 0, "mẹ"), W("哥哥", "ge", "ge", 1, 0, "anh trai")
];

/** danh hiệu học chữ Hán theo bậc (số lần hoàn thành tốt tính như minigame khác: TIER_XP) */
export const HANZI_TITLES = ["Học trò mới", "Học trò chăm", "Tú tài", "Cử nhân", "Tiến sĩ", "Trạng nguyên", "Văn thánh"];
