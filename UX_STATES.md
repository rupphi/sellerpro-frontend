# Trạng thái tải của sellerpro

- Tải dữ liệu lần đầu: dùng `Skeleton`, `ProductSkeletonRows`, `ListSkeleton` hoặc `PageSkeleton`. Giữ tiêu đề, thanh công cụ và kích thước vùng nội dung ổn định. Không hiện trạng thái rỗng hoặc số 0 khi chưa có kết quả.
- Tải lại: giữ dữ liệu đang hiển thị. Chỉ dùng dữ liệu trước đó cho bộ lọc/phân trang trong cùng cửa hàng; không giữ dữ liệu của cửa hàng khác.
- Bảng sản phẩm: cuộn gần cuối vùng bảng để tải tiếp 30 sản phẩm từ database, không có nút chuyển trang. Giữ hàng cũ và bản nháp khi nối dữ liệu; skeleton chỉ bổ sung cuối bảng. Lỗi tải tiếp có nút thử lại tại cuối danh sách. Thay đổi cửa hàng/bộ lọc đưa vị trí cuộn về đầu; các yêu cầu cũ được hủy khi không còn dùng.
- Thao tác gửi: dùng `Button loading`. Nội dung vẫn giữ chỗ, spinner nằm giữa nút, chặn gửi lặp. Không thêm độ trễ giả chỉ để kéo dài loading.
- Lỗi form: dùng `FormError`, luôn có vùng thông báo dự phòng và `role="alert"`. Lỗi dài vẫn được phép xuống dòng, không cắt mất thông tin.
- Đăng nhập thành công: giữ trạng thái loading cho đến khi chuyển trang; khi lỗi mới cho phép gửi lại.
- Công việc chạy nền: hiển thị tiến độ ngoài luồng bố cục, không đẩy bảng lên/xuống khi xuất hiện hoặc biến mất.
- Tôn trọng `prefers-reduced-motion`. Không dùng animation thay đổi kích thước khối dữ liệu.

## Kiểm thử

Hai file `tests/auth-loading.browser.js` và `tests/page-loading.browser.js` là hàm dùng với trình kiểm thử Playwright (`browser_run_code_unsafe`, truyền `filename` tuyệt đối). Chạy ứng dụng ở `localhost:3000` trước. Toàn bộ yêu cầu liên quan đều được giả lập; không cần khóa API hoặc tài khoản thật.

- Form đăng nhập: desktop/mobile, gửi lỗi hai lần, giữ vị trí/kích thước form và nút, spinner, chặn gửi lặp.
- Trang dữ liệu: skeleton đúng cấu trúc bảng, giữ chiều cao vùng bảng, giữ hàng cũ khi tìm kiếm, không báo rỗng trong lúc tải công việc, hỗ trợ giảm chuyển động.
- Ảnh kiểm thử ghi trong `outputs/sellerpro-*.png`.
- `tests/infinite-products.browser.js`: kiểm tra tải khi cuộn, loại bỏ hàng trùng, giữ bản nháp, thử lại sau lỗi, dừng khi hết danh sách và bắt đầu từ lô đầu khi tìm kiếm.
