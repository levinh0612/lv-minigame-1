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
  { v: "2.80", date: "05/10/2026", notes: ["Màn chuẩn bị ca: nút Chuẩn bị nhanh, một chạm nhập hàng theo gợi ý và mua đồ ăn cho bé đang đói; có dòng lãi ước tính của ca", "Màn kết quả: bảng tóm tắt lãi, mục tiêu, vé và combo ngay đầu thẻ", "Màn chính hiện danh hiệu Vua diệt chuột khi bạn đã có hạng"] },
  { v: "2.79", date: "05/10/2026", notes: ["Sự kiện chuột vào tiệm (khoảng 35% ca): chạm vào chuột để bắt, trong 10 giây đầu bắt kịp thì được thưởng xu và lên hạng Vua diệt chuột (F, E, D…)", "Để lâu: từ giây 30 một bé mèo đi làm bị ngất, không làm việc được; giây 45 có cảnh báo; giây 60 khách báo sở y tế, bắt buộc đóng ca và bị phạt 8% số xu (thấp nhất 100, cao nhất 1.000)", "Có thể trả tiền xử lý nhanh (40% tiền phạt) từ giây 10 để chuột biến mất ngay", "Màn tổng kết ca báo chuột đã bắt, tiền xử lý và tiền phạt"] },
  { v: "2.78", date: "05/10/2026", notes: ["Combo phục vụ: giao nhanh 3 sao liên tiếp (Hoàn hảo) thì dồn thưởng, trả cuối ca; khách giận bỏ về hoặc giao sai bánh thì đứt chuỗi và mất một nửa thưởng đã dồn (tiền bánh và tip vẫn nguyên)", "Ô linh vật hiện ngay trong ca với chỉ số đang cộng (đã nhân thân thiết)", "Phiếu mở: bàn làm bánh lớn lấp phần trống khi đủ chỗ", "Màn tổng kết ca báo thưởng combo và phần bị mất"] },
  { v: "2.77", date: "05/10/2026", notes: ["Phim triệu hồi quay dọc: màn hình dọc phát bản phim xoay dọc phủ kín màn hình, màn ngang vẫn phát bản ngang", "Ảnh linh vật (mèo...) nét hơn khi hiện to: ảnh 768px, các ảnh cũ nâng lên 512px", "Thân thiết: mỗi ca hoàn thành cùng linh vật thì thân thiết hơn (5 cấp: 0, 3, 8, 15, 25 ca), mỗi cấp +12% chỉ số linh vật; xem ở bảng chi tiết và báo ở màn tổng kết ca", "Tối ưu đồ hoạ tiệm: giảm một nửa đèn điểm (tiệm lớn từ 19 xuống 10), độ phân giải tối đa 1,5x thay vì 1,75x"] },
  { v: "2.76", date: "05/10/2026", notes: ["Giảm giật khi xoay tiệm: đổi mức chất lượng thì vẽ lại ngay (không còn chớp trắng), model 3D đồng hành cập nhật chuyển động nhẹ hơn"] },
  { v: "2.75", date: "05/10/2026", notes: ["Bạch Chi có model 3D thật (đã rig bằng Mixamo, dáng đứng thở) đứng trong tiệm khi cho đồng hành", "Tranh minh hoạ full hiện tràn màn hình lúc triệu hồi rồi mới thu nhỏ vào thẻ", "Khách quen có nút Xem model 3D (cả người, xoay nhẹ) trong bảng chi tiết", "Gỡ standee 2D; Chisa, Zhongli, Jiyan chưa có model dùng được (tư thế chữ T, Mixamo không rig được) nên chưa hiện trong tiệm nhưng vẫn cộng chỉ số"] },
  { v: "2.74", date: "05/10/2026", notes: ["Xem trước vật phẩm: nút Xem hiệu ứng triệu hồi chạy đúng phim summon theo độ hiếm rồi ra thẻ (ghi Xem trước, không đổi dữ liệu); món có model 3D thì hiện 3D xoay ngay trong bảng chi tiết"] },
  { v: "2.73", date: "05/10/2026", notes: ["Bảng Có thể trúng gì?: chạm vào món để xem trước (tranh full hoặc 3D xoay, chỉ số, mô tả) trước khi quay, có nút quay lại danh sách", "Tách nền lại 4 standee nhân vật cho viền sạch hơn"] },
  { v: "2.72", date: "05/10/2026", notes: ["Jiyan, Bạch Chi, Chisa, Zhongli đứng trong tiệm dạng standee theo đúng dáng đứng bạn đưa (tách nền), luôn quay mặt về phía camera, thay cho model 3D dang tay chữ T", "Bỏ 4 model 3D dang tay khỏi game (nhẹ hơn khoảng 12MB)"] },
  { v: "2.71", date: "05/10/2026", notes: ["Jiyan và Phượng Hoàng cũng hiện tranh minh hoạ full lúc triệu hồi rồi thu nhỏ vào thẻ"] },
  { v: "2.70", date: "05/10/2026", notes: ["Nâng bản để máy nhận bản mới của Gacha: video summon giữ độ phân giải gốc, tranh minh hoạ full lúc triệu hồi (Lynae, Bạch Chi, Chisa, Zhongli), Siro đứng yên không còn quay vòng"] },
  { v: "2.69", date: "05/10/2026", notes: ["Phim quay Gacha dùng đúng video bạn đưa: Thường 0–6s, Hiếm 9–13s, Cực hiếm 14–23s (đã cắt bỏ chữ và logo), có dự phòng nếu video không phát được", "Thêm 7 linh vật/hộ vệ 3D: Mèo Béo, Mèo Xiêm, Bạch Chi, Chisa, Jiyan, Zhongli, Phượng Hoàng; đang đồng hành thì đứng cạnh chủ tiệm trong cảnh 3D và cộng chỉ số thật (giá bánh, tip, khách chờ lâu hơn, thêm khách mỗi ca)", "Thú cưng Siro và Cacao đổi sang model 3D mới", "Bộ sưu tập gacha: 37 vật phẩm; Lynae, Bạch Chi, Chisa, Zhongli hiện tranh minh hoạ full lúc triệu hồi rồi thu nhỏ vào thẻ"] },
  { v: "2.68", date: "05/10/2026", notes: ["Gacha Summon: quay công thức bánh đặc biệt, trang trí, nhân vật 3D làm khách quen và linh vật; Thường 70% / Hiếm 25% / Cực hiếm 5%", "Vé: miễn phí mỗi ngày, đạt hết mục tiêu ca, nhận quà ngày, hoặc mua 300 xu (10 vé 2.700 xu); 10 lần chắc chắn có Hiếm, 50 lần chắc chắn có Cực hiếm", "Đồ trùng đổi Bụi sao (50 Bụi = 1 vé); công thức trùng thì thành thạo, giá bán tăng", "Nhân vật gacha ghé tiệm làm khách quen (tip, kiên nhẫn, VIP), Hiếm và Cực hiếm có hào quang; không còn trong phần tùy chỉnh cá nhân", "Phim triệu hồi 3 mức: Thường (~2s) tụ sáng nhẹ; Hiếm (~3,6s) tụ năng lượng, sóng xung kích, rung màn hình, chữ HIẾM; Cực hiếm (~5,6s) sao băng vàng, rung dần, chớp trắng, ba lớp sóng, pháo giấy, chữ CỰC HIẾM, cánh sáng. Có âm thanh riêng, chạm để bỏ qua", "Trước khi ra thẻ, vật phẩm hiện to cả màn hình với chuyển động riêng: nhân vật bước vào trong cột sáng và hào quang, thú cưng nảy lên với trái tim, bánh xoay một vòng, đồ trang trí lật ra, kèm tên, sao độ hiếm và dấu MỚI!", "Quay 10 lần: món hiếm nhất hiện to trước, rồi 10 thẻ lật lần lượt, thẻ Hiếm và Cực hiếm bung hạt khi lật", "Linh vật dùng hình mèo, chó dễ thương: Chó Bông, Mèo Xám, Mèo Đêm, Mèo Thiên Thần", "Xem trước toàn bộ vật phẩm có thể trúng theo độ hiếm (tên, lợi ích, tỷ lệ); thẻ chưa có hiện hình mờ thay vì dấu hỏi"] },
  { v: "2.67", date: "05/10/2026", notes: ["Mua đồ ăn trên thẻ bé nào thì bé đó được ăn trước, không còn bé khác nhận mất phần vừa mua"] },
  { v: "2.66", date: "05/10/2026", notes: ["Sửa lỗi màn Chuẩn bị báo đủ đồ ăn cho cả ba bé trong khi kho chỉ đủ một phần: giờ mỗi bé lấy phần của mình lần lượt, bé nào thiếu hiện Đói ngay"] },
  { v: "2.65", date: "05/10/2026", notes: ["Sửa nút Theo dõi người ấy và nút Xem lại hướng dẫn bị ẩn mất (kiểu CSS của thanh tóm tắt ở màn chơi trùng tên)"] },
  { v: "2.64", date: "05/10/2026", notes: ["Ghé thăm nhà hàng xóm: bấm Ghé thăm ở bảng xếp hạng hoặc ô người ấy, xem cảnh 3D tiệm của họ theo đúng dữ liệu của họ", "Phí vé 2% số xu (tối thiểu 10, tối đa 100), mỗi tiệm một lần mỗi ngày, ghé lại trong ngày thì miễn phí", "Chủ tiệm nhận 70% phí làm tiền mừng và có hộp thoại báo: Quý nhân tới thăm và gửi tiền mừng"] },
  { v: "2.63", date: "05/10/2026", notes: ["Giờ vàng: tiệm còn ghế dư thì giữa ca có đợt khách đông bất ngờ, thêm tối đa bằng số ghế dư", "Đầu tư tiệm làm tăng độ nổi tiếng: mỗi lầu +0,8, mỗi lần mở rộng +0,5, mỗi cấp nâng bàn +0,25 điểm", "Khách ngồi bàn cấp cao kiên nhẫn hơn (+15% mỗi cấp) và tip nhiều hơn (+25% mỗi cấp)", "Màn Chuẩn bị báo số ghế dư và khả năng gặp giờ vàng"] },
  { v: "2.62", date: "05/10/2026", notes: ["Hiện rõ Sức chứa hiện tại và số khách giờ cao điểm ở màn chính và bảng nâng cấp tiệm", "Bàn không còn xếp sát cầu thang, chừa chỗ riêng cho cầu thang ở góc đông"] },
  { v: "2.61", date: "05/10/2026", notes: ["Sửa lầu trên bị thiếu bàn ghế (do bước gộp nội thất làm mất)", "Bàn trải đều theo chiều rộng phòng ở từng lầu", "Ban đêm sáng hơn: đèn tỏa xa hơn và mạnh hơn, ánh sáng nền cao hơn", "Khách không còn đi lạc vào lầu trên"] },
  { v: "2.60", date: "05/10/2026", notes: ["Các lầu nối với nhau bằng cầu thang ở góc đông bắc; chỉ lầu trệt có cửa chính"] },
  { v: "2.59", date: "05/10/2026", notes: ["Lầu mới không còn trống: bàn được chia đều cho các lầu, lầu trên không có cánh cửa chính của lầu trệt", "Mỗi lần mở rộng ngang thêm 2 chỗ đặt bàn mỗi lầu; các bàn trải đều theo chiều rộng phòng", "Đèn treo đặt theo từng cột bàn nên phần mở rộng không còn bị tối"] },
  { v: "2.58", date: "05/10/2026", notes: ["Xây thêm lầu thì có thêm lầu thật: nút T1, T2... trong cảnh 3D để chuyển xem từng lầu", "Bàn nhiều hơn chỗ ở lầu trệt thì tự xếp lên lầu trên", "Nhìn từ ngoài tiệm thấy các lầu chồng lên nhau"] },
  { v: "2.57", date: "05/10/2026", notes: ["Sửa phần mở rộng của tiệm bị tối: thêm đèn treo cho phần mới, ánh sáng và bóng đổ phủ cả phòng rộng"] },
  { v: "2.56", date: "04/10/2026", notes: ["Mở rộng cửa hàng thì phòng thật sự rộng thêm về phía đông (mỗi lần thêm 2), có thêm chỗ cho bàn", "Mua bàn, nâng bàn, xây lầu, mở rộng: trừ xu và cập nhật cảnh tiệm ngay, không cần tải lại trang", "Thêm nút Nâng cấp tiệm dưới nút vào/ra tiệm trong cảnh 3D", "Sửa cảnh báo bóng PCFSoftShadowMap của Three.js"] },
  { v: "2.55", date: "04/10/2026", notes: ["Sửa lỗi không dựng được cảnh 3D ở màn chính sau khi đổi bố cục bàn (phải dùng cảnh 2D)"] },
  { v: "2.54", date: "04/10/2026", notes: ["Độ viral là số khách giờ cao điểm; sức chứa là tổng ghế của các bàn", "Bàn có cấp 1 đến 3, chứa 2 / 3 / 4 người; nâng cấp bàn 400 và 800 xu", "Mỗi lầu có 4 chỗ đặt bàn, mở rộng ngang thêm 1 chỗ mỗi lầu", "Tiệm mới bắt đầu với 2 bàn; người chơi cũ được tặng đủ ghế đang có", "Cảnh tiệm vẽ đúng số ghế của từng bàn"] },
  { v: "2.53", date: "04/10/2026", notes: ["Cảnh tiệm vẽ đúng số bàn: mỗi bàn là một bàn nhỏ có một ghế, 6 bàn thì thấy 6 bàn"] },
  { v: "2.52", date: "04/10/2026", notes: ["Số bàn theo độ viral: thêm 3 bậc nổi tiếng mới (tối đa 12 bàn)", "Mua thêm bàn (300 / 600 / 1.000 xu), xây thêm lầu (1.000 xu, gấp đôi mỗi lần), mở rộng cửa hàng ngang (2.000 xu, gấp đôi mỗi lần)", "Khách đông hơn số bàn thì bắt buộc nâng cấp mới mở tiệm được", "Người chơi cũ được tặng sẵn số bàn đang có", "Cảnh tiệm hiện đúng số ghế (3 đến 6); hàng đợi tự xuống hàng khi trên 6 bàn"] },
  { v: "2.51", date: "04/10/2026", notes: ["Đồng xu may rủi và kết quả của nó không tắt được bằng nút ✕, chạm nền hay kéo xuống nữa, phải bấm đồng xu và bấm nút trong hộp thoại"] },
  { v: "2.50", date: "04/10/2026", notes: ["Chọn món ăn cho từng bé ở màn Chuẩn bị ca (bé bậc 2, 3 chọn được món thấp hơn bậc)", "Hết món đã chọn thì bé ăn món kém hơn kế tiếp thay vì nghỉ đói, nhưng làm bánh chậm hơn 25% mỗi bậc", "Hạt và Pate không còn vô dụng sau khi bé lên bậc 3"] },
  { v: "2.49", date: "04/10/2026", notes: ["Sửa lỗi huy hiệu số xu ở thanh trên cùng bị phóng to và che chữ (do kiểu CSS của đồng xu may rủi trùng tên)"] },
  { v: "2.48", date: "04/10/2026", notes: ["Thưởng đăng nhập mỗi ngày (10% số xu đang có) có trần 2.000 xu"] },
  { v: "2.47", date: "04/10/2026", notes: ["Đồng xu sự cố giờ cách nhau 3 phút chơi (trước đây 1 phút)"] },
  { v: "2.46", date: "04/10/2026", notes: ["Sự cố bất ngờ giờ là một đồng xu để tự bấm, mỗi phút chơi có một lần: 70% bình an, 30% gặp sự cố; mức thấp trừ 3%, trung bình 6%, cao 8% số xu đang có", "Đền bù 3.000 xu một lần vì trừ xu quá tay", "Thưởng đăng nhập đầu tiên mỗi ngày: 10% số xu đang có (hiện ở Ví)"] },
  { v: "2.45", date: "04/10/2026", notes: ["Thêm Nữ mũ mèo và Nam kiếm sĩ (tự gắn xương cho tượng tĩnh) vào Hồ sơ và làm khách ra vào tiệm"] },
  { v: "2.44", date: "04/10/2026", notes: ["Thêm 2 nhân vật nữ 3D trong Hồ sơ: Nữ Lynae (áo sơ mi, váy xếp ly) và Nữ thường phục (áo crop, quần short); cả hai cũng làm khách ra vào tiệm"] },
  { v: "2.43", date: "04/10/2026", notes: ["Bầu trời đêm đẹp hơn: mặt trăng lưỡi liềm đậu ở góc trên bên trái (không còn bị căn phòng che), sao nhỏ và sắc nét thay cho các chấm to nhoè"] },
  { v: "2.42", date: "04/10/2026", notes: ["Sự cố bất ngờ: cứ 1 phút chơi xét một lần, 50% bị trừ khoảng 1/10 xu", "Chống giật mạnh: đồ nội thất gộp thành ít khối (số lần vẽ giảm hơn một nửa, thời gian vẽ giảm gần một nửa), nhân vật nam và nữ giảm còn khoảng 40% số tam giác"] },
  { v: "2.41", date: "04/10/2026", notes: ["Sự cố bất ngờ: cứ 5 phút chơi xét một lần, 50% bị trừ khoảng 1/10 xu", "Chống giật: cảnh tiệm nhẹ hơn khoảng 25% (bớt tam giác, bỏ bóng và viền cho vật rất nhỏ), khách kế tiếp được dựng sẵn khi chỗ còn vắng nên không khựng lúc khách xuất hiện"] },
  { v: "2.40", date: "04/10/2026", notes: ["Sự cố bất ngờ (bị trừ khoảng 1/10 xu) giờ xảy ra bất cứ lúc nào khi đang mở app, kể cả giữa ca, cứ khoảng 6 đến 12 phút chơi xét một lần; đang trong ca thì ca tự tạm dừng khi hộp thoại hiện, đóng xong chơi tiếp", "Không còn xét sự cố sau khi hết ca"] },
  { v: "2.39", date: "04/10/2026", notes: ["Khách ra vào và ngồi bằng cả nhân vật 3D mới: Nữ anime, Nữ cyber, Nam thật và 8 khách low-poly (nam, nữ nhiều kiểu áo)", "Khoảng 3 trên 10 khách mỗi ca là nhân vật 3D làm sẵn; ảnh đại diện khách cũng dùng các model này"] },
  { v: "2.38", date: "04/10/2026", notes: ["Thêm 2 nhân vật 3D: Nữ cyber và Nam thật (cạnh Nữ anime) trong Hồ sơ, đi/đứng/ngồi như các nhân vật khác", "Khách ngồi tay xuôi tự nhiên trên đùi (trước đây tay duỗi thẳng ra trước)", "Chống giật: bóng đổ vẽ thưa hơn, tự hạ độ phân giải khi máy chậm; khách không còn đi quay chậm khi tụt khung hình"] },
  { v: "2.37", date: "04/10/2026", notes: ["Thêm nhân vật Nữ anime 3D đủ người (tóc hai chùm, sừng, cardigan, boot) trong Hồ sơ: đi, đứng, ngồi như các nhân vật khác; giữ nguyên trang phục nên không đổi màu hay kiểu tóc"] },
  { v: "2.36", date: "04/10/2026", notes: ["Thêm kiểu Tóc dài anime cho nhân vật nam (tóc dài chấm vai, mái dày, đổi theo màu tóc)"] },
  { v: "2.35", date: "04/10/2026", notes: ["Thêm kiểu Tóc anime cho nhân vật nam: tóc xù nhiều lọn lấy từ model tóc có sẵn, đổi theo màu tóc"] },
  { v: "2.34", date: "04/10/2026", notes: ["Chỉnh lại 4 kiểu tóc 3D của nam: mái rẽ lệch, lọn xuôi theo đầu, tóc tối màu không còn bị đen bệt; bỏ kiểu tóc dựng vì nhìn lạ"] },
  { v: "2.33", date: "04/10/2026", notes: ["Nhân vật nam có 5 kiểu tóc 3D dựng mới thay hẳn tóc gốc: tóc cua, mái ngố, bob, tóc dài, tóc dựng (đổi theo màu tóc)"] },
  { v: "2.32", date: "04/10/2026", notes: ["Gỡ 5 kiểu tóc 3D thử nghiệm (bob, dài, xoăn, dựng, bồng) vì nhìn không đẹp"] },
  { v: "2.31", date: "04/10/2026", notes: ["Màn nhập PIN làm lại: ảnh đại diện 3D trong vòng màu, nền theo màu giao diện, ô số bo tròn mới", "Biển hiệu, mái hiên, mái nhà và rèm theo màu giao diện bạn chọn (cam thì ra cam, không còn hồng)", "Trang trí thêm nhiều món: 3 tường, 2 sàn, 2 quầy, 2 rèm, 2 đèn, 3 đồ treo tường, 3 cây, 3 thảm"] },
  { v: "2.30", date: "04/10/2026", notes: ["Trang trí tiệm mượt hơn nữa: đổi rèm, đèn, cây, thảm và đồ treo tường giờ cũng đổi ngay tại chỗ, không còn khựng"] },
  { v: "2.29", date: "04/10/2026", notes: ["Nhân vật sống động hơn: chớp mắt, thỉnh thoảng mở miệng, đầu và thân lắc nhẹ, nhún người; ảnh đại diện ở thẻ hồ sơ và trong Hồ sơ cũng chuyển động", "Màn chính: thẻ hồ sơ gọn hơn (cấp ngay trên ảnh, thanh kinh nghiệm), thư và Sửa tiệm thành hai nút tròn hai bên nút Mở tiệm, thanh 4 nút dưới vẽ lại icon gradient", "Mục tiêu và Quà tặng mở dạng hộp thoại trượt từ dưới lên"] },
  { v: "2.28", date: "04/10/2026", notes: ["Trang trí tiệm hết giật: đổi tường, sàn, quầy là đổi ngay tại chỗ (không dựng lại cảnh); đổi rèm, đèn, cây, thảm thì giữ cảnh cũ rồi mới đổi một lần", "Cảnh tiệm dựng nhanh hơn: mặt tiền, đường, cây phía ngoài chỉ dựng khi bấm xem ngoài tiệm"] },
  { v: "2.27", date: "04/10/2026", notes: ["Màn chính: cảnh 3D phủ cả màn hình, thanh trên, hồ sơ, thư, nút Mở tiệm và 4 nút dưới là lớp phủ gọn gàng", "Icon điều khiển cảnh (xoay, phóng to thu nhỏ, xem ngoài tiệm) vẽ lại cho đẹp", "Hồ sơ: chọn Nữ hoặc Nam riêng, chọn kiểu tóc riêng (mũ len, băng đô, búi tóc, đuôi ngựa, hai chùm, tai mèo, nơ, hoa cài, kính tròn)", "Mũ len vẽ lại đúng kiểu mũ len; Trang trí tiệm mượt hơn, chạm liên tiếp không còn giật"] },
  { v: "2.26", date: "04/10/2026", notes: ["Cài đặt: ghi công nhân vật nữ 3D (Cute Hiking Girl, CGTrader)"] },
  { v: "2.25", date: "04/10/2026", notes: ["Hồ sơ: chọn thêm màu quần và màu giày; màu mắt giờ đổi được thật trên nhân vật 3D", "12 kiểu nhân vật giờ là 12 kiểu đầu 3D (mũ len, băng đô, búi tóc, kính tròn, tai mèo, nơ, hoa cài...); tên kiểu hiện dưới ảnh", "Ảnh đại diện ở thẻ hồ sơ và bảng chọn là ảnh chụp từ model 3D, đúng với nhân vật trong tiệm"] },
  { v: "2.24", date: "04/10/2026", notes: ["Nhân vật nữ cũng là model 3D thật (mũ len, áo khoác, giày sneaker), đổi màu tóc, da, áo, quần theo Hồ sơ; khách nữ đi, ngồi, đứng dậy như khách nam", "Màn Trang trí tiệm dùng cảnh 3D giống màn chính: thử đồ nào thấy ngay trong tiệm 3D, xoay và phóng to được", "Sửa lỗi khách bị giật lùi một đoạn khi ngồi xuống ghế"] },
  { v: "2.23", date: "04/10/2026", notes: ["Sự cố bất ngờ: thỉnh thoảng sau khi hết ca, tiệm gặp chuyện (cúp điện, khách quỵt tiền, nguyên liệu hư, sở y tế kiểm tra...) và bị trừ khoảng 1/10 số xu; hộp thoại có hình trượt từ dưới lên báo rõ lý do", "Sự cố không xảy ra với người mới, khi còn dưới 100 xu, hoặc ngay sau một sự cố khác; xem khoản trừ ở mục Chi trong Ví", "Biết trước số khách: màn Chuẩn bị ca và nút Mở tiệm hiện rõ hôm nay có bao nhiêu khách"] },
  { v: "2.22", date: "04/10/2026", notes: ["Khách ra vào đi về phía bên trái cửa, không còn đụng vào cây bên phải"] },
  { v: "2.21", date: "04/10/2026", notes: ["Nhân vật nam là model 3D thật, đầu to kiểu chibi cho hợp với nữ; tóc, da, áo khoác, áo trong, quần, giày đổi màu theo Hồ sơ", "Tiệm có cửa thật: cửa tự mở khi có khách đi qua rồi đóng lại; khách đứng dậy đi ra, vắng một lúc rồi khách khác đi vào ngồi xuống; xem ngoài tiệm cũng thấy đúng như bên trong", "Biển tên tiệm nâng lên trên mái bạt, không còn bị che", "Máy không tải được model thì tự dùng lại nhân vật cũ"] },
  { v: "2.20", date: "04/10/2026", notes: ["Cảnh tiệm 3D: buổi sáng có trời xanh, mặt trời, tia nắng và mây; chiều tà màu cam; buổi tối có trăng, sao và đèn đường"] },
  { v: "2.19", date: "03/10/2026", notes: ["Màn chính là cảnh tiệm 3D: xoay 4 góc, sáng và tối theo giờ thật, chạm thú cưng, menu, tủ bánh, ảnh, hộp quà như trước", "Đồ trang trí hiện đúng trong cảnh 3D; chủ tiệm là nhân vật bạn chọn trong Hồ sơ", "Xem ngoài tiệm (nút 🏪), phóng to thu nhỏ, thú cưng nhỏ gọn hơn, tủ bánh thấp trong suốt thấy bánh bên trong","Màn chính: thẻ hồ sơ có ảnh chân dung lớn; Tủ bánh cuộn được trên máy tính","Máy yếu thì tắt ở Cài đặt, game dùng lại cảnh 2D"] },
  { v: "2.18", date: "03/10/2026", notes: ["Vẽ lại toàn bộ khách theo phong cách mới: 6 kiểu nữ, 6 kiểu nam, mỗi người một màu tóc, mắt, áo, da riêng; thỉnh thoảng chớp mắt", "Khách chỉ còn nam và nữ: bỏ khách con vật, Milo, Siro, Cacao không còn ghé tiệm làm khách (các bé chỉ làm nhân viên)", "Milo, Siro, Cacao có hình mới, đổi biểu cảm theo tâm trạng", "Hồ sơ của bạn: chọn nhân vật (12 kiểu, đổi màu tóc/mắt/áo/da), sửa tên tiệm, chọn màu giao diện (hồng, xanh dương, xanh lá, tím, cam, xám); tự đồng bộ giữa các máy"] },
  { v: "2.17", date: "03/10/2026", notes: ["Storybook cuộn được lại, có nút xuất file để gửi Claude Design"] },
  { v: "2.16", date: "28/09/2026", notes: ["Thêm 5 bài nhạc nền: Mưa ngoài hiên, Xe đạp 8-bit, Bossa matcha, Hẹn hò, Ru ngủ", "Chạm nút nhạc ở màn chính để chọn bài, nghe thử ngay", "Sửa góc bảng xếp hạng bị lem màu"] },
  { v: "2.15", date: "28/09/2026", notes: ["Bảng xếp hạng mở ngay trên màn chính (hộp thoại)"] },
  { v: "2.14", date: "28/09/2026", notes: ["Đổi ảnh, đổi đồ ở máy này là máy kia thấy trong khoảng 20 giây", "Không còn chuyện máy cũ đè mất thay đổi của máy mới"] },
  { v: "2.13", date: "28/09/2026", notes: ["Hộp thoại: tiêu đề và nút dưới luôn cố định, chỉ phần giữa cuộn", "Lúc rảnh tay: xem số khách, tiền ca này và 3 mục tiêu ca", "Thẻ thợ bánh có hình bánh, chạm vào xem bé làm từng bước", "Hộp thoại có nút ✕, kéo xuống không còn kéo theo cả app"] },
  { v: "2.12", date: "28/09/2026", notes: ["Treo ảnh của hai đứa lên tường tiệm (chạm ô + trên tường)", "Chạm bảng Menu, Tủ bánh để xem các món", "Chạm số ngày yêu để xem mọi ngày kỷ niệm", "Hộp thoại trượt từ dưới lên như iPhone, kéo xuống để đóng", "Tên bánh ghi đủ Đế + Kem + Topping"] },
  { v: "2.11", date: "28/09/2026", notes: ["Chọn đúng đủ 4 món là tự giao bánh", "Hàng đợi có viên đường cho biết độ ngọt khách gọi", "Thu gọn phiếu: thấy bánh đang làm cạnh đơn khách", "Tắt Tự nhận đơn thì các bé làm đơn đó luôn", "Công tắc Đi làm, Nhạc nền… dễ nhìn hơn"] },
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
