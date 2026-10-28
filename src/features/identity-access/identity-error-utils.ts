import { ApiClientError } from '../../lib/api/client';

export type IdentityView = 'invitation' | 'login' | 'reset-request' | 'restoring';

export function readField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

export function identityErrorMessage(error: unknown, view?: IdentityView): string {
  if (error instanceof ApiClientError) {
    if (error.kind === 'network' || error.kind === 'timeout') {
      return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.';
    }
    if (error.status === 400 || error.code === 'VALIDATION_ERROR' || error.status === 422) {
      if (error.details && error.details.length > 0) {
        const pwDetail = error.details.find(
          (d) => d.path === 'password' || d.path === 'newPassword',
        );
        if (pwDetail) {
          if (pwDetail.code === 'too_small') {
            return 'Mật khẩu quá ngắn. Mật khẩu phải từ 1 đến 128 ký tự.';
          }
          if (pwDetail.code === 'too_big') {
            return 'Mật khẩu quá dài (tối đa 128 ký tự).';
          }
          return `Mật khẩu chưa hợp lệ: ${pwDetail.message}`;
        }
        return (
          error.details
            .map((d) => d.message)
            .filter(Boolean)
            .join(' ') || 'Thông tin nhập vào chưa hợp lệ. Vui lòng kiểm tra lại.'
        );
      }
      if (view === 'invitation') {
        return 'Mật khẩu chưa hợp lệ hoặc không đáp ứng chính sách. Mật khẩu phải từ 1 đến 128 ký tự.';
      }
      if (view === 'login') {
        return 'Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại email và mật khẩu.';
      }
      return 'Thông tin nhập vào chưa hợp lệ. Vui lòng kiểm tra lại.';
    }
    if (
      error.status === 401 ||
      error.code === 'AUTHENTICATION_REQUIRED' ||
      error.code === 'INVALID_CREDENTIALS' ||
      error.code === 'INVALID_OR_EXPIRED_TOKEN'
    ) {
      if (view === 'login') {
        return 'Email hoặc mật khẩu chưa chính xác. Vui lòng kiểm tra và thử lại.';
      }
      if (view === 'invitation') {
        return 'Liên kết lời mời đã hết hạn hoặc mật khẩu tài khoản hiện tại chưa chính xác. Nếu đã có tài khoản, hãy nhập đúng mật khẩu hiện tại.';
      }
      return 'Thông tin xác thực không hợp lệ hoặc phiên làm việc đã hết hạn.';
    }
    if (error.status === 403) {
      return 'Bạn chưa có quyền thực hiện thao tác này.';
    }
    if (error.status === 404) {
      return 'Liên kết không còn tồn tại hoặc tài nguyên không tìm thấy.';
    }
    if (error.status === 409) {
      return view === 'invitation'
        ? 'Lời mời này đã được chấp nhận trước đó. Vui lòng đăng nhập để tiếp tục.'
        : 'Dữ liệu có xung đột hoặc thao tác đã được thực hiện trước đó. Vui lòng làm mới trang.';
    }
    if (error.status === 429) {
      return 'Bạn đã thực hiện thao tác quá nhiều lần. Vui lòng chờ ít phút rồi thử lại.';
    }
    if (error.status && error.status >= 500) {
      return 'Máy chủ đang gặp sự cố tạm thời. Vui lòng thử lại sau.';
    }
    if (
      error.message &&
      error.message !== 'The request is invalid.' &&
      error.message !== 'Password does not satisfy the configured policy.'
    ) {
      return error.message;
    }
  }
  return 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
}
