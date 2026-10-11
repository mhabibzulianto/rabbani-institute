import Link from "next/link";
import CourseCard from "@/components/CourseCard";
import ArticleCard from "@/components/ArticleCard";
import { formatExamWindow, minutesToExamDurationLabel } from "@/lib/exam-utils";
import { hasMidtransServerKey } from "@/lib/payments";
import { getLandingContent } from "@/lib/landing";
import LandingRenderer from "../packages/landing-page/Renderer";
import "./landing-renderer.css";

function Course({ item, index }) { return <CourseCard course={item} language="id" index={index} />; }
function Article({ item, index }) { return <ArticleCard article={item} index={index} />; }
function Exam({ item }) { return <article className="panel"><p className="section-label">Ujian</p><h3>{item.title}</h3><p>{item.subtitle}</p><p className="muted-line">{formatExamWindow(item)}</p><p className="muted-line">{minutesToExamDurationLabel(item.duration_minutes)} · maksimal {item.max_attempts} attempt</p><Link className="button primary" href={`/exams/${encodeURIComponent(item.slug)}`}>Buka ujian</Link></article>; }
export default async function LandingPage({ document }) {
  const pools = await getLandingContent(document);
  return <LandingRenderer document={document} pools={pools} cards={{ courses: Course, exams: Exam, articles: Article }} paymentReady={hasMidtransServerKey()} />;
}
