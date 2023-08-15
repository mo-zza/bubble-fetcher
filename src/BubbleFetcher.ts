import axios, { Method, AxiosRequestConfig } from "axios";
import convertToURLFormat from "./convertToURLFormat";

type FetcherParams<RequestData = any> = {
  method?: Method;
  body?: RequestData;
  objectName?: string;
  BUBBLE_API_KEY?: string;
  isDev?: boolean;
  domain?: string;
};

type FetcherParamsWithoutMethod = Omit<FetcherParams, "method">;

type FetcherFn = <RequestData = {}>(
  params: FetcherParams<RequestData>
) => Promise<any>;

type SortOption = {
  key: string;
  order: "ASC" | "DESC";
};

type Constraints = {
  key: string;
  constraint_type: (typeof ConstraintType)[number];
  value?: string | boolean;
};

const ConstraintType = ["equals", "not equal"] as const;

const fetcher: FetcherFn = async ({
  method,
  body = null,
  objectName,
  BUBBLE_API_KEY,
  isDev = false,
  domain,
}) => {
  const uri = isDev
    ? `https://${domain}/version-test/api/1.1/obj/${objectName}`
    : `https://${domain}/api/1.1/obj/${objectName}`;

  const requestInit: AxiosRequestConfig = {
    method,
    url: uri,
    data: body,
    headers: {
      Authorization: `Bearer ${BUBBLE_API_KEY}`,
    },
  };

  try {
    let result: any[] = [];
    const response = await axios.request(requestInit);
    if (method === "GET" || method === "get") {
      const { remaining, count } = response.data.response;
      if (remaining === 0) {
        result = [...response.data.response.results];
      }

      if (remaining > 0) {
        const pages = Math.ceil((remaining + count) / 100);
        for (let index = 0; index <= pages; index++) {
          const cursor = index * 100;

          const customInit = {
            url: `${requestInit.url}?cursor=${cursor}`,
            ...requestInit,
          };

          const response = await axios(customInit);
          result = [...response.data.response.results];
        }
      }
    } else {
      result = response.data;
    }
    return result;
  } catch (error) {
    console.log("error : ", error);
  }
};

const get = async <ResponseData>(objectName: string) => {
  return await fetcher<ResponseData>({ method: "GET", objectName });
};

const post = async <RequestData>({
  objectName,
  body,
}: FetcherParamsWithoutMethod) => {
  return await fetcher<RequestData>({ method: "POST", objectName, body });
};

const patch = async <RequestData>({
  objectName,
  body,
}: FetcherParamsWithoutMethod) => {
  return await fetcher<RequestData>({
    method: "PATCH",
    objectName,
    body,
  });
};

const put = async <RequestData>({
  objectName,
  body,
}: FetcherParamsWithoutMethod) => {
  return await fetcher<RequestData>({ method: "PUT", objectName, body });
};

const deleteTable = async <RequestData>(objectName: string) => {
  return await fetcher<RequestData>({ method: "DELETE", objectName });
};

const constraintsDefaultFormat = ({
  key,
  constraint_type,
  value,
}: Constraints) => {
  return `{ "key": "${key}", "constraint_type": "${constraint_type}", "value": "${value}" } `;
};

const getWithConstraints = async <ResponseData>(
  objectName: string,
  constraints: Constraints[],
  sortOption?: SortOption
) => {
  const formattedConstraints = constraints
    .map((el) => constraintsDefaultFormat(el))
    .join(",");

  const formattedParameter = convertToURLFormat(
    `${objectName}?constraints=[${formattedConstraints}]`
  );

  return await fetcher<ResponseData>({
    method: "GET",
    objectName: sortOption
      ? (`${formattedParameter}&sort_field=${sortOption.key}&=${
          sortOption?.order === "ASC" ? true : false
        }` as any)
      : formattedParameter,
  });
};

export type { Constraints };

export const bubbleAPI = {
  get: (objectName: string) => get(objectName),
  post: (data: FetcherParamsWithoutMethod) => post(data),
  patch: (data: FetcherParamsWithoutMethod) => patch(data),
  put: (data: FetcherParamsWithoutMethod) => put(data),
  delete: (objectName: string) => deleteTable(objectName),
  getWithConstraints: (
    objectName: string,
    constraints: Constraints[],
    sortOption?: SortOption
  ) => getWithConstraints(objectName, constraints, sortOption),
};
