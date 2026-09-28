/* Lộ trình nâng cấp, hiện ở trang "Sắp ra mắt" (#/sap-ra-mat).
   Muốn cập nhật: đổi `status` của từng mục, thêm mục mới, rồi push. Không cần sửa giao diện. */

export type Status = "done" | "doing" | "soon" | "later";
export const STATUS_LABEL: Record<Status, string> = {
  done: "Đã có",
  doing: "Đang làm",
  soon: "Sắp ra mắt",
  later: "Dự kiến"
};

export interface RoadItem { title: string; desc: string; status: Status }
export interface Phase { id: string; name: string; goal: string; when: string; color: string; items: RoadItem[] }

export const PHASES: Phase[] = [
  {
    id: "p0", name: "Nền móng", goal: "Game chạy mượt, chơi được cả khi mất mạng", when: "Tháng 9/2026", color: "#8FD9B6",
    items: [
      { title: "Giao diện Kẹo dâu phồng", desc: "Bánh có mặt cười, khách là người và thú cưng, bắn tim khi giao bánh.", status: "done" },
      { title: "Chơi offline như app", desc: "Thêm vào màn hình chính, mất mạng vẫn mở được tiệm.", status: "done" },
      { title: "Mỗi màn có đường dẫn riêng", desc: "Nút Back trên điện thoại hoạt động đúng, không lỡ tay thoát ca đang bán.", status: "done" },
      { title: "Đi chợ & kho nguyên liệu", desc: "Nhập hàng trước ca, hết giữa ca thì nhập nhanh. Cuối ca xem lãi.", status: "done" },
      { title: "Milo, Siro, Cacao làm thợ bánh", desc: "Các bé tự nhận đơn làm bánh cho khách, thấy rõ ai làm đơn nào, được bao nhiêu; lương là Hạt, Pate, Ức gà.", status: "done" },
      { title: "Độ nổi tiếng", desc: "Tiệm càng được khen, càng đẹp thì càng đông: từ 3 lên tới 6 bàn.", status: "done" },
      { title: "Quà khai trương", desc: "Lần đầu chơi được tặng vốn: 300 xu và 5 gói Hạt.", status: "done" },
      { title: "Hướng dẫn & sao lưu", desc: "Hướng dẫn lần đầu; sao lưu tiến trình bằng một đoạn mã để đổi máy không mất.", status: "done" }
    ]
  },
  {
    id: "p1", name: "Tiệm của riêng bạn", goal: "Ai cũng tạo được một tiệm để tặng người thương", when: "Sắp ra mắt",
    color: "#FF8FAB",
    items: [
      { title: "Tạo tiệm tặng người yêu", desc: "Nhập tên, ngày quen, sinh nhật, chọn thú cưng, viết sẵn thư, rồi gửi một đường link.", status: "doing" },
      { title: "Tài khoản & lưu theo tên tiệm", desc: "Tên tiệm + PIN 4 số; đổi điện thoại chỉ cần đăng nhập là có lại tiệm.", status: "done" },
      { title: "Thêm ảnh vào thư", desc: "Mỗi lá thư có thể kèm một tấm ảnh kỷ niệm.", status: "soon" }
    ]
  },
  {
    id: "p2", name: "Ngày nào cũng muốn ghé", goal: "Luôn có điều mới chờ ở tiệm", when: "Sau giai đoạn 1", color: "#FFD66B",
    items: [
      { title: "Nhắc 7g dậy, 11g ngủ", desc: "Thông báo chào buổi sáng, nhắc đi ngủ; ngày đặc biệt có lời chúc riêng.", status: "done" },
      { title: "Bảng xếp hạng", desc: "Các tiệm thi nhau xem ai kiếm được nhiều xu nhất.", status: "done" },
      { title: "Sự kiện theo mùa", desc: "Tết, Trung thu, Noel với bánh và đồ trang trí riêng.", status: "later" },
      { title: "Album sticker", desc: "Sưu tầm sticker từ khách và thú cưng, dán thành trang kỷ niệm.", status: "later" },
      { title: "Thay đồ cho Milo, Siro, Cacao", desc: "Mũ, nơ, áo len cho ba bé.", status: "later" }
    ]
  },
  {
    id: "p3", name: "Hai người cùng chơi", goal: "Người tặng cũng ở trong tiệm", when: "Dự kiến", color: "#C9B8F0",
    items: [
      { title: "Gửi thư ngay lúc đó", desc: "Anh viết thư từ điện thoại của mình, Em mở trong tiệm.", status: "later" },
      { title: "Hẹn thư cho ngày đặc biệt", desc: "Viết trước thư sinh nhật, kỷ niệm; đúng ngày mới mở được.", status: "later" },
      { title: "Anh ghé tiệm thật", desc: "Khách đặc biệt chỉ xuất hiện khi người kia thật sự gửi lời nhắn.", status: "later" },
      { title: "Thả tim qua lại", desc: "Chạm vào nhau trong tiệm, bên kia thấy ngay.", status: "later" },
      { title: "Ghép đôi trên bảng xếp hạng", desc: "Hai tiệm hiện cạnh nhau, xem ai đang dẫn trước.", status: "done" }
    ]
  },
  {
    id: "p4", name: "Tiệm lớn hơn", goal: "Lên App Store, Play Store và nhiều ngôn ngữ", when: "Dự kiến", color: "#9FD8F5",
    items: [
      { title: "Theme & skin", desc: "Gói giao diện và trang phục thú cưng. Không bán xu để thắng.", status: "later" },
      { title: "Gói quà kỷ niệm", desc: "Thêm ảnh, thư không giới hạn, tên miền riêng cho tiệm.", status: "later" },
      { title: "App trên điện thoại", desc: "Tải từ App Store và Play Store.", status: "later" },
      { title: "Tiếng Anh", desc: "Tặng người thương ở bất kỳ đâu.", status: "later" }
    ]
  }
];

/* "Có gì mới": bản mới nhất ở trên cùng */
export interface Release { v: string; date: string; notes: string[] }
export const CHANGELOG: Release[] = [
  { v: "2.10", date: "28/09/2026", notes: ["Tự cập nhật khi mở app, không cần tắt app mở lại nữa", "Cập nhật xong hiện Có gì mới", "Cài đặt: xem phiên bản, kiểm tra bản mới, tải lại bản mới nhất"] },
  { v: "2.9", date: "28/09/2026", notes: ["Tài khoản: tên tiệm + PIN 4 số, lần sau mở app chỉ hỏi PIN", "Tiệm tự lưu theo tên, đổi máy chỉ cần đăng nhập", "Bấm vào số xu để xem ví: tổng thu, tổng chi, lịch sử", "Bảng xếp hạng theo tiền bán hàng: Tuần này / Tất cả, theo dõi người ấy bằng tên tiệm"] },
  { v: "2.8", date: "28/09/2026", notes: ["Bảng xếp hạng theo tài sản (xu + đồ đang có)", "Ghép đôi: hai tiệm hiện cạnh nhau, xem ai dẫn trước", "Tự lưu mỗi khi có thay đổi, màn chính hiện ☁︎ đã lưu", "Chuyển máy bằng mã 6 ký tự; hai máy lệch nhau thì hỏi giữ bản nào", "Có bản mới thì hiện nút cập nhật"] },
  { v: "2.7", date: "28/09/2026", notes: ["Lưu trên mây: tự lưu sau mỗi ca, đổi máy nhập mã tiệm là lấy lại", "Bảng xếp hạng theo tổng xu kiếm được", "Thông báo 7:00 chào buổi sáng và 23:00 nhắc đi ngủ (bật trong Cài đặt)"] },
  { v: "2.6", date: "28/09/2026", notes: ["Màn chính có cảnh tiệm: Milo, Siro, Cacao sau quầy, tủ bánh, bàn khách", "Trang trí mới: 8 nhóm (tường, sàn, quầy, rèm, đèn, treo tường, cây, thảm), chạm để thử trước khi mua", "Đồ trang trí cũ tự chuyển sang kiểu mới, không mất gì"] },
  { v: "2.5", date: "28/09/2026", notes: ["Màn Chơi mới: phiếu order kéo lên/thu gọn, icon cho từng nguyên liệu", "Kho nguyên liệu mở ngay giữa ca", "Mục tiêu mỗi ca có thưởng xu", "Màn Kết quả là tấm bảng giơ lên", "Màn Chuẩn bị và Nhân viên nhỏ mới; Siro thành mèo Anh golden"] },
  { v: "2.4", date: "28/09/2026", notes: ["Hàng đợi chung trên một hàng, không cần vuốt ngang", "Công tắc Tự nhận đơn / rảnh tay", "Chỉ hiện hình bánh; tự nhớ công thức được thưởng +50%", "Các bé tự nhập nhanh nguyên liệu, báo rõ khi thiếu"] },
  { v: "2.3", date: "27/09/2026", notes: ["Quà khai trương 300 xu + 5 Hạt", "Thú cưng làm thợ bánh, tự nhận đơn; lương bằng Hạt / Pate / Ức gà", "Độ nổi tiếng: tới 6 bàn", "Lv 1 có sẵn 4 công thức", "Thẻ gọi món mới dễ nhìn hơn"] },
  { v: "2.2", date: "27/09/2026", notes: ["Màn Chuẩn bị ca: đi chợ, nhập theo gợi ý", "Milo, Siro, Cacao đi làm", "Bảng lãi cuối ca, cấp tiệm ở màn chính", "Hướng dẫn lần đầu, sao lưu / khôi phục, rung nhẹ"] },
  { v: "2.1", date: "27/09/2026", notes: ["Chơi offline, tự cập nhật bản mới", "Trang Sắp ra mắt", "Nút Back hoạt động đúng trên điện thoại"] },
  { v: "2.0", date: "27/09/2026", notes: ["Giao diện mới Kẹo dâu phồng", "9 công thức, khách là người", "Icon app mới"] },
  { v: "1.2", date: "27/09/2026", notes: ["Ghi rõ tên bánh, báo đúng/sai từng nguyên liệu"] },
  { v: "1.0", date: "26/09/2026", notes: ["Mở tiệm lần đầu"] }
];
