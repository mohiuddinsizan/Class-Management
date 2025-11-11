export default function Button({ variant="primary", children, ...rest }){
  const cls = `btn ${variant==="primary" ? "btn-primary" : "btn-ghost"}`;
  return <button className={cls} {...rest}>{children}</button>;
}
