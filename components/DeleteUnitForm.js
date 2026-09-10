"use client";

export default function DeleteUnitForm({ action, courseId, lessonId, label, confirmMessage }) {
  return (
    <form
      className="inline-form"
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="lessonId" value={lessonId} />
      <button className="button ghost small" type="submit">
        {label}
      </button>
    </form>
  );
}
