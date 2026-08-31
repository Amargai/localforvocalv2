export async function api(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const defaultHeaders = {
    'Content-Type': 'application/json'
  };

  // If body is FormData (file upload), let the browser set Content-Type with boundary
  if (options.body instanceof FormData) {
    delete defaultHeaders['Content-Type'];
  }

  const token = localStorage.getItem('l4v_token');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  });

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = { message: await response.text() };
  }

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}
