import { useDispatch, useSelector } from "react-redux";

// The app layer supplies the concrete store types without a shared -> app import.
declare global { interface AppStoreTypes {} }
export const useAppDispatch = useDispatch.withTypes<AppStoreTypes["dispatch"]>();
export const useAppSelector = useSelector.withTypes<AppStoreTypes["state"]>();
