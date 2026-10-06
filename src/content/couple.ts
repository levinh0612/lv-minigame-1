/* =====================================================================
   CẤU HÌNH RIÊNG CỦA CẶP ĐÔI — sửa ở đây cho hợp với hai đứa mình.
   (Lộ trình: giai đoạn 1 sẽ chuyển phần này thành màn "Tạo tiệm" + lưu trên server.)
   ===================================================================== */
export interface PetCfg { id: PetId; name: string; desc: string }
export type PetId = "dog" | "gold" | "white";
export type EventKey = "anniversary" | "monthly" | "herBirthday" | "hisBirthday" | "milestone" | "valentine" | "women83" | "women2010";

export const CFG = {
  herName: "Em",               // tên bạn nữ (đổi trong ⚙️ cũng được)
  hisName: "Anh",              // tên bạn nam
  shopName: "Tiệm Bánh Matcha Nhỏ",
  metDate: "2023-08-10",       // ngày quen nhau
  herBirthday: "1998-12-28",
  hisBirthday: "2000-12-06",
  pets: [
    {id:"dog",   name:"Milo",  desc:"Cún trắng lông xù như cục bông, thích chạy vòng vòng quanh quầy"},
    {id:"gold",  name:"Siro",  desc:"Mèo Anh lông ngắn golden, mặt tròn, mê ngủ trên tủ bánh"},
    {id:"white", name:"Cacao", desc:"Mèo trắng hay ngồi canh khay bánh"}
  ],
  // Tên khách (cách nhau bằng dấu phẩy), đổi được trong Cài đặt
  girlNames: "Chị Na, Chị Mơ, Chị Bông, Cô Hạnh, Chị Kem, Chị Thơ",
  boyNames: "Anh Tùng, Anh Bin, Cậu Khoai, Anh Mít, Anh Su, Anh Đậu",
  // Thư mỗi ngày: mỗi ngày mở 1 lá, hết thì quay vòng. Thêm bớt tuỳ thích.
  notes: [
    "Hôm nay Em đã làm việc chăm lắm rồi. Nghỉ tay ăn miếng bánh matcha ít ngọt nha, Anh bao.",
    "Nếu Em là bánh thì Em là bánh matcha: nhìn thì dịu dàng, nếm vào mới thấy thương.",
    "Anh không cần bánh ngọt, có Em cười là đủ ngọt rồi.",
    "Nhớ uống đủ nước nha. Milo với Siro với Cacao nhắc giùm Anh đó.",
    "Cảm ơn Em đã chọn Anh, hôm qua, hôm nay và cả mai nữa.",
    "Hôm nay trời có đẹp không? Không đẹp bằng Em đâu.",
    "Tiệm mình ế cũng được, miễn chủ tiệm vui là được.",
    "Siro lại ngủ quên trên tủ bánh rồi. Giống ai đó hay ngủ nướng ghê.",
    "Anh để dành một phần bánh ngon nhất cho Em, lúc nào Em về cũng có.",
    "Mệt thì nói Anh nghe. Anh không giỏi nấu nhưng giỏi ôm.",
    "Ít đường, nhiều matcha, và thật nhiều thương. Công thức của tụi mình đó.",
    "Cacao vừa dụi đầu vào tay Anh, chắc nó nhớ Em.",
    "Mỗi ngày bên Em đều là một ngày Anh muốn ghi lại.",
    "Hôm nay Em giỏi lắm. Anh tự hào về Em.",
    "Dù Em có làm cháy bánh, Anh vẫn ăn hết.",
    "Milo hỏi bao giờ Em dắt nó đi dạo. Anh cũng hỏi câu đó.",
    "Anh thích cách Em nhăn mặt khi uống đồ quá ngọt.",
    "Tối nay đi ăn gì? Anh để Em chọn, nhưng Anh đoán là có matcha.",
    "Có những ngày không ổn, nhưng mình vẫn có nhau mà.",
    "Nụ cười của Em là món đắt nhất tiệm, không bán cho ai hết.",
    "Anh đếm ngày bên Em mà chưa thấy chán lần nào.",
    "Nếu hôm nay Em buồn, mở game ra vuốt ve ba bé một chút nha.",
    "Anh hứa sẽ luôn nhớ Em thích ít ngọt.",
    "Cảm ơn Em vì đã kiên nhẫn với Anh.",
    "Hôm nay Anh cũng thương Em nhiều như hôm qua. Có khi còn hơn.",
    "Tiệm mình nhỏ thôi, nhưng đủ chỗ cho hai đứa với ba bé.",
    "Ước gì giờ được ngồi cạnh Em, chia nhau miếng bánh cuộn.",
    "Em là điều dễ thương nhất xảy ra với Anh.",
    "Nhớ ăn sáng nha. Bánh matcha không tính là bữa sáng đâu!",
    "Ngủ ngon nha chủ tiệm. Mai lại mở cửa tiếp."
  ],
  // Thông báo đẩy mỗi sáng (7:00) và tối (23:00), {her} là tên người nhận
  morning: [
    "Thư hôm nay đã đến tiệm rồi, Milo đang đợi {her} mở cửa nè ☀️",
    "Dậy thôi {her} ơi, Siro nướng xong mẻ bánh matcha đầu tiên rồi 🍵",
    "Chào buổi sáng! Cacao giữ chỗ đẹp nhất trong tiệm cho {her} rồi đó 💌"
  ],
  night: [
    "11 giờ rồi, đi ngủ thôi {her}. Milo tắt đèn tiệm nha 🌙",
    "Tiệm đóng cửa rồi, Siro cuộn tròn ngủ trên tủ bánh. {her} cũng ngủ ngon nha 💤",
    "Cất điện thoại đi ngủ thôi, mai tiệm còn đông khách lắm đó ✨"
  ],
  eventNotes: {
    anniversary: "Chúc mừng {n} năm mình yêu nhau!\nCảm ơn Em đã ở bên Anh suốt {d} ngày qua. Năm nay mình đi ăn bánh matcha thật nha.",
    monthly: "Tròn {n} tháng bên nhau rồi đó!\nMỗi tháng Anh lại thương Em thêm một chút.",
    herBirthday: "Chúc mừng sinh nhật {her}!\nTuổi {age} thật vui, thật khoẻ, và luôn được thương. Hôm nay tiệm tặng Em gấp đôi xu.",
    hisBirthday: "Hôm nay sinh nhật {his} đó nha!\nEm nhớ chúc Anh một câu nhé.",
    milestone: "Ngày thứ {d} bên nhau!\nMột con số tròn trịa cho một chuyện tình tròn trịa.",
    valentine: "Valentine vui vẻ nha Em!\nSocola thì Em chê ngọt, nên Anh tặng Em matcha.",
    women83: "Chúc mừng 8/3 chủ tiệm xinh đẹp của Anh!",
    women2010: "Chúc mừng 20/10! Hôm nay Em chỉ cần ngồi thu tiền thôi, để Anh làm bánh."
  }
} as {
  herName: string; hisName: string; shopName: string; metDate: string; herBirthday: string; hisBirthday: string;
  pets: PetCfg[]; girlNames: string; boyNames: string; notes: string[]; morning: string[]; night: string[]; eventNotes: Record<EventKey, string>;
};
