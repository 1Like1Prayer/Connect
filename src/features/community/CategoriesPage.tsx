import { categoriesPageCopy } from '../../copies/index'
import { Link } from 'react-router'
import { CATEGORIES, SUBCATEGORIES } from '../../lib/catalog'
import { isEnded } from '../../lib/format'
import { useAppStore } from '../../lib/store'
import type { Category } from '../../lib/types'
import { CategoryGlyph, useCategoryColor } from './shared'
import styles from './Community.module.css'

function CategoryCard({ category, count }: { category: Category; count: number }) {
  const color = useCategoryColor(category.key)
  return <article className={styles.categoryCard} style={{ borderTopColor: color }}>
    <div className={styles.categoryHeading}>
      <CategoryGlyph category={category.key} />
      <div>
        <h2><Link to={`/discover?category=${category.key}`}>{category.name}</Link></h2>
        <p>{count} {count === 1 ? categoriesPageCopy.connect : categoriesPageCopy.connects}{categoriesPageCopy.nearby}</p>
      </div>
    </div>
    <div className={styles.subcategories}>
      {SUBCATEGORIES[category.key].map(subcategoryName => <Link
        key={subcategoryName}
        className={styles.subcategory}
        to={`/discover?${new URLSearchParams({ category: category.key, subcategory: subcategoryName })}`}
      >{subcategoryName}</Link>)}
    </div>
  </article>
}

export function CategoriesPage() {
  const connects = useAppStore(applicationState => applicationState.connects)
  const active = connects.filter(connect => connect.status === 'published' && !isEnded(connect) && connect.visibility === categoriesPageCopy.everyone)
  return <div className={`page ${styles.categoriesPage}`}>
    <h1>{categoriesPageCopy.browseByCategory}</h1>
    <p className={styles.introduction}>{categoriesPageCopy.findAConnectThatFitsYourInterestsOrBring}</p>
    <div className={styles.categoryGrid}>
      {CATEGORIES.map(category => <CategoryCard key={category.key} category={category} count={active.filter(connect => connect.categoryKey === category.key).length} />)}
    </div>
  </div>
}
