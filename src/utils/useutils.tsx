/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-var */
/* eslint-disable no-unused-vars */
import { toast } from "sonner";;

const notifySuccess = (str: string) => {
  toast.success(str, {
    position: "top-right",
    duration: 5000,
    style: {
      backgroundColor: '#fff', // green-500
      color: 'green',
      // border: '1px solid #059669', // green-600
    },
    closeButton: true,
  });
};

const notifyError = (str: string) => {
  toast.error(str, {
    position: "top-right",
     style: {
      // backgroundColor: '#e00e0e10', // green-500
      // color: 'red',
      // border: '0px solid red', // green-600
    },
    duration: 5000,
    closeButton: true,
  });
};



export {
  notifySuccess,
  notifyError,
};

