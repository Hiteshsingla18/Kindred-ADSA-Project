window.kindredApi = async (path, options = {}) => {
  const response = await fetch(path, {
    ...options,
    headers: { Accept: "application/json", ...options.headers }
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`The C++ backend returned an invalid response (${response.status}).`);
  }
  if (!response.ok) throw new Error(data.error || `The C++ backend returned ${response.status}.`);
  return data;
};
