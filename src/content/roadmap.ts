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
  { v: "2.31", date: "04/10/2026", notes: ["Màn nhập PIN làm lại: ảnh đại diện 3D trong vòng màu, nền theo màu giao diện, ô số bo tròn mới", "Biển hiệu, mái hiên, mái nhà và rèm theo màu giao diện bạn chọn (cam thì ra cam, không còn hồng)", "Trang trí thêm nhiều món: 3 tường, 2 sàn, 2 quầy, 2 rèm, 2 đèn, 3 đồ treo tường, 3 cây, 3 thảm", "5 kiểu tóc 3D mới trong Hồ sơ: bob, dài, xoăn, dựng, bồng (đổi theo màu tóc)"] },
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
