import Link from "next/link";
import { Clock3, Star, Users } from "lucide-react";
import { formatIdr, getCourseModelLabel, getMadrasahDurationLabel, localize, minutesToLabel } from "@/lib/data";
import { resolveCoursePrice } from "@/lib/payments";
import { getCoursePublicUrl } from "@/lib/platform-urls";

export default function CourseCard({ course, language, index = 0 }) {
  const title = localize(course, "title", language);
  const description =
    localize(course, "short_description", language) || localize(course, "description", language);
  const category = localize(course.category, "title", language);
  const price = resolveCoursePrice(course);
  const isBeta = course.status === "beta";
  const isFeatured = index === 1 && !isBeta;
  const scheduleLabel =
    course.course_model === "madrasah"
      ? getMadrasahDurationLabel(course, language)
      : minutesToLabel(course.duration_minutes);
  const participantLabel = `${Number(course.enrollment_count || 0)} peserta`;
  const ratingLabel = course.rating_value ? String(course.rating_value) : "N/A";

  return (
    <article className={`course-card${isFeatured ? " is-featured" : ""}`}>
      <div className="course-body">
        <div className="course-card-badges">
          <span className="pill">{category}</span>
          <span className="pill course-card-type-pill">{getCourseModelLabel(course.course_model)}</span>
          {isBeta ? <span className="pill status-beta">beta</span> : null}
          {isFeatured ? <span className="pill course-card-popular-pill">Populer</span> : null}
        </div>
        <h3>{title}</h3>
        <p>{description}</p>
        <div className="course-card-stats">
          <span>
            <Clock3 size={16} />
            {scheduleLabel}
          </span>
          <span>
            <Users size={16} />
            {participantLabel}
          </span>
          <span>
            <Star size={16} />
            {ratingLabel}
          </span>
        </div>
        <div className="course-card-footer">
          <div>
            <dt>Level: {course.level}</dt>
            <dd>{isBeta ? "Akses beta" : price > 0 ? formatIdr(price) : "Gratis"}</dd>
          </div>
          <Link className={`button ${isFeatured ? "primary" : "secondary"} small`} href={getCoursePublicUrl(course.slug)}>
            Selengkapnya
          </Link>
        </div>
      </div>
    </article>
  );
}
