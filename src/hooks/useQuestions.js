import { useEffect, useState } from "react";
import { adminService } from "../api/services";

// Questions change rarely; fetch once per page load and share the promise.
let cache = null;

export const loadQuestions = () => {
  cache ??= adminService
    .getQuestions()
    .then((res) => res.data || [])
    .catch((err) => {
      cache = null;
      throw err;
    });
  return cache;
};

export const refreshQuestions = () => {
  cache = null;
  return loadQuestions();
};

export const useQuestions = () => {
  const [questions, setQuestions] = useState([]);
  useEffect(() => {
    let alive = true;
    loadQuestions()
      .then((q) => alive && setQuestions(q))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return questions;
};
