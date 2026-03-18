# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e6]:
    - generic [ref=e8]:
      - img "Logo" [ref=e10]
      - heading "Login" [level=2] [ref=e12]
      - alert [ref=e13]: Invalid email/username or password.
      - generic [ref=e14]:
        - generic [ref=e15]:
          - text: Email or Username
          - textbox "Email or Username" [ref=e16]: testadmin
        - generic [ref=e17]:
          - text: Password
          - generic [ref=e18]:
            - textbox "Password" [ref=e19]: Test@Password1!
            - button [ref=e20] [cursor=pointer]:
              - img [ref=e21]
        - generic [ref=e24]:
          - checkbox "Remember my email/username" [ref=e25] [cursor=pointer]
          - generic [ref=e26] [cursor=pointer]: Remember my email/username
        - button "Login" [ref=e27] [cursor=pointer]
    - generic [ref=e28]:
      - img "Casino" [ref=e29]
      - heading "Casino Management System" [level=2] [ref=e31]
  - region "Notifications alt+T"
  - generic [ref=e36] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e37]:
      - img [ref=e38]
    - generic [ref=e41]:
      - button "Open issues overlay" [ref=e42]:
        - generic [ref=e43]:
          - generic [ref=e44]: "0"
          - generic [ref=e45]: "1"
        - generic [ref=e46]: Issue
      - button "Collapse issues badge" [ref=e47]:
        - img [ref=e48]
  - alert [ref=e50]
```